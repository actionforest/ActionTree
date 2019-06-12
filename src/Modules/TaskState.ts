/**
 * @file TaskState
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {reduce, clone,omit} from 'lodash/fp'
import Bluebird from "bluebird";

// @ts-ignore
const uncappedReduce = reduce.convert({ 'cap': false });

export type TaskUpdateParams =
    'uuid'
  | 'name'
  | 'complete'
  | 'suspended'
  | 'error'
  | 'aborted'
  | 'abort_error'
  | 'retry_attempts'
  | 'retry_delay'
  | 'retries_remaining'
  | 'requeue_count'
  | 'current_transition'
  | 'created_at'
  | 'updated_at'
  | 'ended_at'
  | 'deleted_at'

export interface BaseTaskState {}

export interface UpdateTaskState extends BaseTaskState{
  uuid?: string
  name?: string
  complete?: boolean
  suspended?: boolean
  error?: boolean
  aborted?: boolean
  abort_error?: string
  retry_attempts?: number
  retry_delay?: number
  retries_remaining?: number
  requeue_count?: number
  current_transition?: number
  created_at?: string
  updated_at?: string
  ended_at?: string
  deleted_at?: string
}

export class TaskState {

  private state: BaseTaskState

  constructor(initialData: UpdateTaskState) {
    this.state = omit(['states', 'transitions'], initialData)
  }

  update(newState: UpdateTaskState){

    let updatedState = uncappedReduce((acc, item, key) => {
      if(acc[key]){
        acc[key] = item
      }
      return acc
    }, clone(this.state), newState)


    return this.state = updatedState
  }

  get(prop: TaskUpdateParams){
    return this.state[prop]
  }

  set(prop: TaskUpdateParams, val: string | number | boolean): string | number | boolean {
    this.state[prop] = val
    return val
  }
}