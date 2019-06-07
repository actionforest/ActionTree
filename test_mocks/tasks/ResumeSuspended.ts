/**
 * @file ResumeSuspended
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const ResumeSuspended = () : Task =>{
  let requeue = true
  let requeueTask: Task = {
    config: {
      name: 'resumeSuspended',
      initial: 'doWork'
    },
     transitions: {
      doWork: (State, taskController) => {
        if (State.count > 0) {
          State.count = State.count - 1
          if (State.count === 10 && requeue) {
            requeue = false
            return [{to: 'doWork', wait: 1000, requeue: true}, State]
          }
          return [{to: 'doWork', wait: 10}, State]
        }
        return [{to: 'moreWork'}, State]
      },
      moreWork: (State) => {
        State.additionalStuff = 47
        return [{to: 'finishWork'}, State]
      },
      finishWork: (State) => {
        return [{to: 'done'}, State]
      }
    }
  }

  return requeueTask
}