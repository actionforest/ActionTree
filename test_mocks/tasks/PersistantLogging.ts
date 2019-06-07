/**
 * @file PersistantLogging
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task} from "../../src"

export const PersistantLogging: Task = {
  config: {
    name: 'persistantLogging',
    initial: 'logmessage'
  },
   transitions: {
    logmessage: (State, taskController) => {
      taskController.logger.log('bob', {ok: true})
      taskController.logger.log('log')
      taskController.logger.warn('warn')
      taskController.logger.info('info')
      taskController.logger.error('error')

      return [{to: 'logAgain'}, State]
    },
    logAgain: (State, taskController) => {
      let a: any = {c : 'ok'}
      a.a = {a: a}
      taskController.logger.log(1,2,3,4,5,6,7,8,9,0, a, ()=>{})
      return [{to: 'done'}, State]
    }
  }
}