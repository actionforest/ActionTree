/**
 * @file ActionTree
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project ActionTree
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import {Store} from './store'
import {TaskRunnerParams, TaskRunner} from "./TaskRunner";
import {PendingTask, TaskController, TaskTypes} from './TaskController'
import {Task, TaskHandler, TransitionFunction, TransitionHandler} from "./TaskHandler";
import {InternalLogger} from './InternalLogger'
import {getOr, isFunction, reduce} from 'lodash/fp'
import {HandlerContainer} from "./HandlerContainer";

// @ts-ignore
const uncappedReduce = reduce.convert({ 'cap': false });


export interface ActionTreeLogger {
  log: Function,
  warn: Function,
  info: Function,
  error: Function
}

export interface ActionTreeSettings {
  infoLogging?: boolean
  debugLogging?: boolean
  logger?: ActionTreeLogger
}

export interface TaskHook {
  (stats: any, requeueData: any) : any
}

interface TaskHooks {
  requeue?: TaskHook,
  failure?: TaskHook
  success?: TaskHook
}

export interface TransitionHook {
  (data: any): any
}

interface TransitionHooks {
  success?: TransitionHook
  failure?: TransitionHook
  start?: TransitionHook
}


const fakeTaskHook = () => {
  return Bluebird.method((stats, requeueData) => {
    return true
  })
}
const fakeTransitionHook = () => {
  return Bluebird.method((data) => {
    return true
  })
}

export class ActionTree {
  private handlerContainer: HandlerContainer
  private tasks: Map<string, TaskHandler>
  private abstract: Map<string, TransitionHandler>
  private readonly Store: Store
  private readonly Settings: ActionTreeSettings
  private readonly internalLogger: InternalLogger
  private taskHooks: TaskHooks
  private transitionHooks: TransitionHooks

  constructor(Store: Store, Settings: ActionTreeSettings){
    this.Store = Store
    this.Settings = {
      infoLogging: getOr(true, 'infoLogging', Settings),
      debugLogging: getOr(false, 'debugLogging', Settings),
      logger: getOr(console, 'logger', Settings)
    }

    this.internalLogger = new InternalLogger(this.Settings)
    this.handlerContainer = new HandlerContainer(this.internalLogger)
    this.tasks = new Map()
    this.abstract = new Map()
    this.internalLogger.debug('log', 'ActionTree created')


    this.taskHooks = {
      requeue: fakeTaskHook(),
      success: fakeTaskHook(),
      failure: fakeTaskHook()
    }

    this.transitionHooks = {
      success: fakeTransitionHook(),
      failure: fakeTransitionHook(),
      start:   fakeTransitionHook()
    }
  }

  registerTask(task: Task){
    this.internalLogger.debug('warn', 'Registering task',task)
    return this.handlerContainer.addHandler(task)
  }

  registerAbstract(name: string,handler: TransitionFunction){
    this.internalLogger.info('log', `Registering abstract handler, "${name}"`)
    return this.handlerContainer.addAbstract(name, handler)
  }

  runTask(pendingTask: PendingTask, identifier?: any): Bluebird<any> {
    let task = new TaskController(pendingTask, identifier)
    let handler: TaskHandler = this.handlerContainer.getHandler(task.name)

    let stats
    if(!handler){
      return Bluebird.reject(new Error(`No task found with the name ${task.name}`))
    }

    let runData: TaskRunnerParams = {
      taskController: task,
      taskHandler: handler,
      Store: this.Store,
      exigencySettings: this.Settings,
      internalLogger: this.internalLogger
    }

    return new TaskRunner(runData).run()
      .then((result) => {

        stats = result[0]
        let hook = this.taskHooks[stats.result]

        if(isFunction(this.taskHooks[stats.result])){
          return this.taskHooks[stats.result](result[0], result[1])
            .then(() => {
              return {ranHook: stats.result, error: null}
            })
            .catch((error) => {
              return {ranHook: stats.result, error: error}
            })
        }
        return true
      })
      .then((result) => {
        return stats
      })
      .catch((error) => {
        this.internalLogger.info('error',error)
        return stats
      })
  }

  registerTaskHooks(hooks: TaskHooks){
    let taskHooks = uncappedReduce((acc, item, key) => {
      if(acc[key]){
        if(isFunction(item)) {
          this.internalLogger.info('log', `Registering Hook: ${key}`)
          acc[key] = Bluebird.method(item)
        } else {
          throw new Error('Provided Task hooks must be functions...')
        }
      }
      return acc
    }, this.taskHooks, hooks)
    this.taskHooks = taskHooks
  }

  registerTransitionHooks(hooks: TransitionHooks){
    let transitionHooks = uncappedReduce((acc, item, key) => {
      if(acc[key]){
        if(isFunction(item)) {
          acc[key] = Bluebird.method(item)
        } else {
          throw new Error('Provided Transition hooks must be functions...')
        }
      }
      return acc
    }, this.transitionHooks, hooks)
    this.transitionHooks = transitionHooks
  }

  closeStore(){
    return this.Store.closeStore()
  }
}