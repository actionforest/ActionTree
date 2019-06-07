/**
 * @file Transition
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import moment from 'moment'
import {LogCache, LogCacheFactory} from "./LogCache";
import {cloneDeep, isEqual, getOr} from 'lodash/fp'
import {Store} from "./store";
import {TaskHandler} from "./TaskHandler";
import {TaskController} from "./TaskController";
import {TransitionUpdate} from "./store/Store";
import {InternalLogger} from "./InternalLogger";

export interface StateChange {
  initial?: boolean
  to?: string,
  requeue?: boolean,
  wait?: number,
}

export interface TransitionParams {
  taskController: TaskController
  taskHandler: TaskHandler
  Store: Store
  stateChange: StateChange,
  internalLogger: InternalLogger
}

export class Transition {
  private taskUuid: string
  private transitionUuid: string
  private transitionDestination: any
  private transitionError: Error | null
  private startingState: any
  private endingState: any
  private suspend: any
  private handler: Function

  private taskController: TaskController
  private stateChange: StateChange
  private internalLogger: InternalLogger
  private taskHandler: TaskHandler
  private Store: Store

  private logCache: LogCache

  constructor({taskController, taskHandler, Store, stateChange, internalLogger}: TransitionParams) {
    this.taskController = taskController
    this.taskHandler = taskHandler
    this.Store = Store
    this.stateChange = stateChange
    this.suspend = null
    this.transitionError = null
    this.taskUuid = taskController.getUuid()
    this.internalLogger = internalLogger
    this.logCache = LogCacheFactory(this.internalLogger)

    this.internalLogger.debug('log', this.stateChange)
  }


  getDestination() {
    return this.stateChange
  }

  taskControl() {
    return {
      suspend: (wait?: number) => {
        this.suspend = {suspend: wait}
      }
    }
  }

  configure(): Bluebird<Function> {

    return Bluebird.try(() => {
      if (this.stateChange.initial) {
        let initial = this.taskHandler.getInitial()
        this.taskController.update({transitionName: initial.name})
        return initial.handler
      }

      let handler = this.taskHandler.getHandler(this.stateChange)
      if (handler) {
        // if (this.stateChange.wait) {
        //   return this.internalWait(this.stateChange.wait, handler)
        // }
        this.taskController.update({transitionName: this.stateChange.to})
        return handler
      }

      throw new Error(`Requested transition: "${this.stateChange.to}" does not exist.`)
    })

  }

  run() {
    return this.configure()
      .then((runFn: Function) => {

        this.handler = runFn
        return this.taskController.getState()
      })
      .then((stateObj) => {
        this.startingState = stateObj
        this.endingState = stateObj
        return this.Store.createTransition(this.taskUuid, this.taskController.getTransitionName(), stateObj.uuid, this.taskController.getCurrentTransition())
      })
      .then((storedTransition) => {
        this.transitionUuid = storedTransition.uuid
        let wait = getOr(0, 'wait', this.stateChange)
        return Bluebird.delay(wait)
      })
      .then(() => {
        let cloned = this.taskController.getState().state

        let controller = {
          logger: {
            log: this.logCache.log,
            warn: this.logCache.warn,
            info: this.logCache.info,
            error: this.logCache.error
          }
        }
        return Promise.resolve(this.handler(cloned, controller))
      })
      .then((result) => {
        let mutatedState = result[1]
        this.transitionDestination = result[0]

        if (isEqual(this.startingState.state, mutatedState)) {
          return this.end()
        }

        return this.changedState(mutatedState)
      })
      .catch((error) => {
        // this.taskController.setTransitionError(error)
        this.taskController.update({transitionError: error})
        this.transitionDestination = {to: 'error'}
        this.transitionError = error
        return this.end(error)
      })
  }


  changedState(mutatedState: any) {

    return this.Store.createState(this.taskUuid, mutatedState)
      .then((stateObj) => {
        // this.taskController.setState(stateObj)
        this.taskController.update({currentState: stateObj})
        this.endingState = stateObj
        return this.end()
      })
  }

  end(error?: Error) {
    let updateData: TransitionUpdate = {
      complete: !error,
      ending_state: getOr(null, 'uuid', this.endingState),
      destination: this.transitionDestination.to,
      requeue: this.transitionDestination.requeue || null,
      wait: getOr(0, 'wait', this.transitionDestination),
      error: !!error,
      error_stack: error ? error.stack : null,
      ended_at: moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS[Z]')
    }

    let persistLogs = this.logCache.transform()

    if(persistLogs.length){
      return this.Store.createLog(this.taskUuid, this.transitionUuid, this.logCache.transform())
        .then(() => {
          return this.Store.updateTransition(this.taskUuid, this.transitionUuid, updateData)
        })
    }

    return this.Store.updateTransition(this.taskUuid, this.transitionUuid, updateData)


  }


}