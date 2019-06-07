/**
 * @file StoreHelpers
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {has, each, isFunction, reduce, first,last,toPairs, omit} from "lodash/fp";
import {TaskUpdate, TransitionUpdate, TaskSettings} from "./Store"
import moment from "moment";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export const UTCNow = () => {
  return moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS[Z]')
}

export const reduceObjProps = <T>(data, updates: T) => {
  return reduce((acc, item) => {
    let key: string = first(item)
    let value = last(item)
    if(has(key, acc)){
      if(isFunction(value)){
        let current = acc[key]
        acc[key] = value(current)
      } else {
        acc[key] = value
      }
    }
    return acc
  }, data, toPairs<any>(updates))
}

export const simpleDefaultTask = (taskSettings: TaskSettings) : any => {
  let t = {
    name: taskSettings.name,
    complete: false,
    suspended: false,
    error: false,
    aborted: false,
    abort_error: null,
    retry_attempts: 0,
    retry_delay: taskSettings.retryDelay || 0,
    requeue_count: 0,
    retries_remaining: taskSettings.retriesRemaining,
    current_transition: 0
  }

  return t
}

export const defaultTask = (uuid: string, taskSettings: TaskSettings)=> {
  let n = moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS[Z]')
  let t = simpleDefaultTask(taskSettings)
  t.uuid = uuid
  t.created_at = n
  t.updated_at = n
  t.ended_at = null
  t.states = {}
  t.transitions = {}
  t.log = {}
  return t
}

export const simpleDefaultTransition = (transitionName: string, startingStateUUID: string, transitionNumber: number): any => {
  let tr = {
    name: transitionName,
    ordinal: transitionNumber,
    complete: false,
    error: null,
    error_stack: null,
    destination: null,
    requeue: null,
    wait: null,
    starting_state: startingStateUUID,
    ending_state: null
  }
  return tr
}

export const defaultTransition = (transitionName: string, uuid: string, startingStateUUID: string, transitionNumber: number) => {
  let n = moment().utc().format('YYYY-MM-DD HH:mm:ss.SSS[Z]')
  let tr = simpleDefaultTransition(transitionName, startingStateUUID, transitionNumber)
  tr.uuid = uuid
  tr.created_at = n
  tr.updated_at = n
  tr.ended_at = null

  return tr
}

export const pruneTaskRetVal = (rawTask: any) => {
  return omit(['states', 'transitions'], rawTask)
  return {
    name: rawTask.name,
    uuid: rawTask.uuid,
    complete: rawTask.complete,
    suspended: rawTask.suspended,
    error: rawTask.error,
    aborted: rawTask.aborted,
    abortError: rawTask.abort_error,
    retryAttempts: rawTask.retry_attempts,
    currentTransition: rawTask.current_transition,
  }
}