/**
 * @file SuspendingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const SuspendingTask: Task = {
  config: {
    name: 'suspendingTask',
    initial: 'doWork',
    retryLimit: 1
  },
   transitions: {
    doWork: (State,taskController) => {
      return [{to: 'doWork', requeue: true}, State]
    }
  }
}