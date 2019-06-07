/**
 * @file SimpleResume
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const SimpleResume: Task = {
  config: {
    name: 'SimpleResume',
    initial: 'first',
    retryLimit: 1
  },
   transitions: {
    first: (State, taskController) => {
      return [{to: 'second', requeue: true}, {}]
    },
    second: (State, taskController) => {
      return [{to: 'third', requeue: true}, {}]
    },
    third: (State, taskController) => {
      return [{to: 'fourth', requeue: true}, {}]
    },
    fourth: (State, taskController) => {
      return [{to: 'done', requeue: true}, {}]
    }
  }
}