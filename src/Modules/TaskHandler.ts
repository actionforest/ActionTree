/**
 * @file TaskHandler
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {getOr, difference} from 'lodash/fp'
import {StateChange} from "./Transition";
import {TaskState} from "./TaskController";

export interface TransitionFunction {
  (State: TaskState, taskController: any) : [TaskState,StateChange]
}

export interface TransitionHandler {
  [key: string]: Function
}

interface TaskConfig {
  name: string
  initial: string
  retryOnError?: boolean
  retryDelay?: number
  delayMultiplier?: number
  retryLimit?: number
  abstractHandlers?: string[]
}

export interface Task {
  config: TaskConfig,
  transitions: TransitionHandler,

}

export class TaskHandler {
  config: TaskConfig
  transitions: TransitionHandler
  getAbstract: Function

  constructor(task: Task, getAbstract: Function, abstractKeys: IterableIterator<string>){

    this.config = {
      name: task.config.name,
      initial: task.config.initial,
      retryOnError: getOr(true, 'config.retryOnError', task ),
      retryDelay: getOr(1000, 'config.retry_delay', task ),
      delayMultiplier: getOr(1.5, 'config.delayMultiplier', task ),
      retryLimit: getOr(1, 'config.retryLimit', task ),
      abstractHandlers: getOr([], 'config.abstractHandlers', task)
    }
    this.getAbstract = getAbstract
    this.transitions = task.transitions

    let missingAbstract = difference(this.config.abstractHandlers, Array.from(abstractKeys))
    if(missingAbstract.length){
      throw new Error(`${this.config.name} is requesting abstract transitions that are not registered. "${missingAbstract.join(',')}"`)
    }
  }

  getConfig(){
    return this.config
  }
  getName(){
    return this.config.name
  }

  getHandler(stateChange: StateChange){
    let ownedHandler = this.transitions[stateChange.to]
    if(ownedHandler) {
      return ownedHandler
    }

    let abstractHandler = this.getAbstract(stateChange.to)

    if(abstractHandler){
      return abstractHandler
    }
    return null
  }

  getInitial(){
    return {name: this.config.initial, handler: this.transitions[this.config.initial]}
  }
}