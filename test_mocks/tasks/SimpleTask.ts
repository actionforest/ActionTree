/**
 * @file SimpleTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const SimpleTask: Task = {
  config: {
    name: 'SimpleTask',
    initial: 'first',
    retryLimit: 1
  },
   transitions: {
    first: (State, taskController) => {
      return [{to: 'second'}, {}]
    },
    second: (State, taskController) => {
      return [{to: 'third'}, {}]
    },
    third: (State, taskController) => {
      return [{to: 'fourth'}, {}]
    },
    fourth: (State, taskController) => {
      return [{to: 'done'}, {}]
    }
  }
}