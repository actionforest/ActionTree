/**
 * @file TaskRunner.ts
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import {TaskController} from "./TaskController";
import {TaskHandler} from "./TaskHandler";
import {Store} from "./store";
import {ActionTreeLogger, ActionTreeSettings} from "./ActionTree";
import {isFunction} from "lodash/fp";
import {StateChange, Transition, TransitionParams} from "./Transition";
import moment from "moment";
import {UTCNow} from "./store";
import {InternalLogger} from "./InternalLogger";

export interface TaskRunnerParams {
  taskController: TaskController,
  taskHandler: TaskHandler,
  Store: Store,
  exigencySettings: ActionTreeSettings
  internalLogger: InternalLogger
}

export class TaskRunner {

  private taskController: TaskController
  private taskHandler: TaskHandler
  private Store: Store
  private settings: ActionTreeSettings
  private internalLogger: InternalLogger
  private startTime: moment.Moment
  private endTime: moment.Moment | null
  private incomplete: boolean

  constructor({taskController, taskHandler, Store, exigencySettings, internalLogger}: TaskRunnerParams) {
    this.taskController = taskController
    this.taskHandler = taskHandler
    this.Store = Store
    this.settings = exigencySettings
    this.internalLogger = internalLogger

    // this.startTime = moment().utc()
    // this.endTime = this.startTime
    this.incomplete = false
  }

  run() {
    return Bluebird.try(() => {
      let type = this.taskController.getType()
      if (isFunction(this[type])) {
        return this[type]()
      }

      throw new Error(`Impossible state: No such handler method ${type}`)
    })
      .then((result) => {

        return result
      })
  }

  private stats(ResultType: string, error = false) {
    let now = this.endTime ? this.endTime : moment().utc()
    let retVal = {
      name: this.taskController.getName(),
      uuid: this.taskController.getUuid(),
      transitions: this.taskController.getCurrentTransition(),
      error: error,
      type: this.taskController.getType(),
      result: ResultType,
      retryDelay: this.taskController.getRetryDelay(),
      startTime: this.startTime.toISOString(),
      endTime: now.toISOString() || null,
      elapsed: now.diff(this.startTime),
      identifier: this.taskController.getIdentifier()
    }

    return retVal
  }

  private requeueData(error = false) {
    if (this.incomplete) {
      return {
        metadata: {
          name: this.taskController.getName(),
          uuid: this.taskController.getUuid(),
          error: !!error
        }
      }
    }

    return null
  }

  private Fresh() {
    return this.Store.createTask({
      name: this.taskController.getName(),
      retriesRemaining: this.taskHandler.getConfig().retryLimit,
      retryDelay: this.taskHandler.getConfig().retryDelay
    })
      .then((result) => {
        this.startTime = moment(result.created_at).utc()
        this.internalLogger.info('log',`Starting Fresh Task: ${result.name}`)
        this.taskController.update({
          uuid: result.uuid,
          currentTransition: result.current_transition,
          retriesRemaining: result.retries_remaining,
          retryDelay: result.retry_delay
        })

        return this.Store.createState(result.uuid, this.taskController.getPayload())
      })
      .then((stateResult) => {

        this.taskController.update({currentState: stateResult})
        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: {initial: true},
          internalLogger: this.internalLogger
        }
        let t = new Transition(trRunData)
        return this.transition(t)
      })
  }

  private ResumeError() {

    return this.Store.getTask(this.taskController.getUuid())
      .then((errorTask) => {
        this.startTime = moment(errorTask.created_at).utc()
        return this.Store.updateTask(errorTask.uuid, {
          // current_transition: count => count + 1,
          retries_remaining: count => count - 1,
          retry_attempts: count => count + 1
        })
      })
      .then((errorTask) => {
        this.internalLogger.info('log',`Resuming Errored Task: ${errorTask.name}`)

        this.taskController.update({
          currentTransition: errorTask.current_transition,
          retriesRemaining: errorTask.retries_remaining,
          retryDelay: errorTask.retry_delay
        })
        return this.retryError(errorTask)
      })
  }

  private ResumeSuspended() {
    return this.Store.getTask(this.taskController.getUuid())
      .then((suspendedTask) => {
        this.startTime = moment(suspendedTask.created_at).utc()
        this.internalLogger.info('log',`Resuming Suspended Task: ${suspendedTask.name}`)
        return this.Store.updateTask(suspendedTask.uuid, {
          // current_transition: count => count + 1,
          requeue_count: count => count + 1
        })
      })
      .then((suspendedTask) => {
        this.taskController.update({
          currentTransition: suspendedTask.current_transition,
          retriesRemaining: suspendedTask.retries_remaining,
          retryDelay: suspendedTask.retry_delay
        })
        return this.retrySuspended(suspendedTask)
      })
  }

  private transition(transition?: Transition) {

    let destination: StateChange
    let trResult
    return transition.run()
      .then((transitionResult) => {
        trResult = transitionResult
        return this.Store.updateTask(this.taskController.getUuid(), {current_transition: count => count + 1})
      })
      .then((taskUpdate) => {
        this.taskController.update({currentTransition: taskUpdate.current_transition})
        if (trResult.destination === 'done') {
          return this.closeTask()
        }

        if (trResult.requeue) {
          this.internalLogger.info('log',`${this.taskController.getName()}: Requeue after ${this.taskController.getCurrentTransition()} transitions.`)
          return this.requeueTask()
        }

        if (trResult.error) {
          return this.retryOrFail(trResult.error)
        }

        destination = {
          to: trResult.destination,
          wait: trResult.wait,
          requeue: trResult.requeue
        }

        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: destination,
          internalLogger: this.internalLogger
        }


        let t = new Transition(trRunData)

        return this.transition(t)
      })
  }

  private closeTask() {
    return this.Store.updateTask(this.taskController.getUuid(), {
      ended_at: UTCNow(),
      complete: true,
      error: false
    })
      .then((result) => {
        let runStats = this.stats('success', false)
        this.endTime = moment(result.ended_at).utc()
        this.internalLogger.info('log',`${this.taskController.getName()}: Finished in ${runStats.elapsed}ms with ${runStats.transitions} transitions.`)
        return [runStats, this.requeueData()]
      })
  }

  private requeueTask(error?: any) {
    this.incomplete = true
    this.endTime = moment().utc()

    return this.Store.updateTask(this.taskController.getUuid(), {error: !!error})
      .then((res) => {
        return [this.stats('requeue', !!error), this.requeueData(!!error)]
      })
  }

  private retryOrFail(error?: Error) {
    if (this.taskHandler.getConfig().retryOnError && this.taskController.getRetriesRemaining()) {
      this.incomplete = true
      let multiplier = this.taskHandler.getConfig().delayMultiplier

      return this.Store.updateTask(this.taskController.getUuid(), {retry_delay: delay => Math.ceil(delay * multiplier)})
        .then((result) => {
          let delay = this.taskController.getRetryDelay()
          this.internalLogger.info('warn',`${this.taskController.getName()}: Failed after ${this.taskController.getCurrentTransition()} transitions. Will Requeue in ${delay}ms`)
          return Bluebird.delay(delay).then(() => {
            return this.requeueTask(error)
          })
        })

    }
    this.internalLogger.info('warn',`${this.taskController.getName()}: Permanently Failed after ${this.taskController.getCurrentTransition()} transitions.`)
    return this.failTask(error)
  }

  private failTask(error?: any) {
    return this.Store.updateTask(this.taskController.getUuid(), {complete: true})
      .then(() => {
        return [this.stats('failure', error), null]
      })
  }

  retrySuspended(t){
    let pendingTransition

    return this.Store.findTransition(t.uuid, this.taskController.getPreviousTransition())
      .then((lastTransition) => {
        pendingTransition = lastTransition
        return this.Store.getState(this.taskController.getUuid(), lastTransition.ending_state)
      })
      .then((startingState) => {
        this.taskController.update({currentState: startingState})
        // this.taskController.setState(startingState)
        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: {to: pendingTransition.destination, wait: pendingTransition.wait},
          internalLogger: this.internalLogger
        }

        let t = new Transition(trRunData)
        return this.transition(t)
      })
  }

  retryError(t) {
    let pendingTransitionUuid
    let pendingTransitionName
    let pendingResult

    /* Put a couple of variable on the scope so we can come back to them later, then get the starting state
     * from our last in-error transition.
     */
    return this.Store.findTransition(t.uuid, this.taskController.getPreviousTransition())
      .then((errorTransition) => {
        pendingTransitionUuid = errorTransition.uuid
        pendingTransitionName = errorTransition.name

        return this.Store.getState(this.taskController.getUuid(), errorTransition.starting_state)
      })
      /* Set the state we found in the taskController, then update the task to reflect the newest retry.
       * Build and run a new transition, using the same parameters as the one that is being retried.
       */
      .then((startingState) => {
        this.taskController.update({currentState: startingState})
        // this.taskController.setState(startingState)
        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: {to: pendingTransitionName},
          internalLogger: this.internalLogger
        }

        let t = new Transition(trRunData)
        return t.run()
      })
      /* Save our transitionDestination to the scope for later. Set complete: true on the prior transition.
       */
      .then((transitionResult) => {
        pendingResult = transitionResult
        // this.taskController.incrementCurrentTransition() //fix this, needs to update task
        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {complete: true})
      })
      .then(() => {
        return this.Store.updateTask(this.taskController.getUuid(), {current_transition: count => count + 1})
      })
      /* Finally we create a new Transition from the saved transitionDestination and hand it off to normal flow control.
       */
      .then((result) => {
        this.taskController.update({currentTransition: result.current_transition})
        if (pendingResult.error) {
          return this.retryOrFail(pendingResult.error)
        }
        let destination: StateChange = {
          to: pendingResult.destination,
          wait: pendingResult.wait,
          requeue: pendingResult.requeue
        }

        let trRunData: TransitionParams = {
          taskController: this.taskController,
          taskHandler: this.taskHandler,
          Store: this.Store,
          stateChange: destination,
          internalLogger: this.internalLogger
        }

        let t = new Transition(trRunData)
        return this.transition(t)
      })
      /* Bail out normally if we encounter an error.
       */
      .catch((error) => {
        return this.Store.updateTransition(this.taskController.getUuid(), pendingTransitionUuid, {
          complete: true,
          error: error
        })
          .then((error) => {
            return this.retryOrFail(error)
          })
      })
  }
}