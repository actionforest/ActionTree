/**
 * @file Logger
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import {ActionTreeLogger, ActionTreeSettings} from "./ActionTree";
import {isFunction} from 'lodash'


function isLogger(logger: ActionTreeLogger, method: string): logger is ActionTreeLogger {
  return isFunction(<ActionTreeLogger>logger[method])
}


const handleLogOutput = function(check: boolean, level: string, args: string[]){
  if(check){
    let logFn = this.logger[level]
    if(isLogger(this.logger, level)){
      this.logger[level].apply(this.logger, args)
    }
  }
}
export class InternalLogger {

  private logInfo: boolean
  private logDebug: boolean
  private logger: ActionTreeLogger

  constructor(settings: ActionTreeSettings){
    this.logInfo = settings.infoLogging
    this.logDebug = settings.debugLogging
    this.logger = settings.logger
  }

  info(level: string, ...args){
    handleLogOutput.apply(this, [this.logInfo, level, args])
  }

  debug(level: string, ...args){
    handleLogOutput.apply(this, [this.logDebug, level, args])
  }

}