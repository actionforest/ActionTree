/**
 * @file Store
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Promise from 'bluebird'

interface StoreConstructor {
  new (config: any): Store
}

export interface StoredState {
  uuid: string,
  state: any
}

type UpdateProperty<T> = (p: T) => T
type NullUpdateProperty<T> = (p: T | null) => T | null

  // complete: false,
  // suspended: false,
  // error: false,
  // aborted: false,
  // abort_error: null,
  // requeue_count: 0,
  // attemptRetry: 0,
  // current_transition: 0,

export interface TaskUpdate {
  complete?: UpdateProperty<boolean> | boolean
  error?: UpdateProperty<boolean> | boolean
  aborted?: UpdateProperty<boolean> | boolean
  abort_error?: NullUpdateProperty<Error> | Error | null
  requeue_count?: UpdateProperty<number> | number
  retry_attempts?: UpdateProperty<number> | number
  retries_remaining?: UpdateProperty<number> | number
  retry_delay?: UpdateProperty<number> | number
  current_transition?: UpdateProperty<number> | number
  updated_at?: UpdateProperty<string> | string
  ended_at?: UpdateProperty<string> | string
}

//   Updatable Transition Defaults
//   row: transitionNumber,
//   complete: false,
//   error: null,
//   destination: null,
//   wait: null,
//   endingState: null

export interface TransitionUpdate {
  complete?: UpdateProperty<boolean> | boolean
  error?: NullUpdateProperty<boolean> | boolean | null
  error_stack?: NullUpdateProperty<string> | string | null
  destination?: NullUpdateProperty<string> | string | null
  wait?: NullUpdateProperty<number> | number | null
  requeue?: NullUpdateProperty<boolean> | boolean | null
  ending_state?: NullUpdateProperty<string> | string | null
  updated_at?: UpdateProperty<string> | string
  ended_at?: UpdateProperty<string> | string
}

export interface TaskSettings {
  name: string
  retriesRemaining?: number,
  retryDelay?: number,
  replyTo: string,
  correlationId: string
}

export interface Store {
  createTask(taskSettings: TaskSettings)
  getTask(taskUuid: string, allData?: boolean)
  updateTask(taskUuid: string, updateData: TaskUpdate)
  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number)
  getTransition(taskUuid: string, transitionUuid: string)
  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate)
  findTransition(taskUuid: string, ordinal: number)
  createState(taskUuid:string, state: any)
  getState(taskUuid: string, stateUuid: string)
  createLog(taskUuid: string, transitionUuid: string, messages: {level: string, message: string}[])
  closeStore(): any
}

