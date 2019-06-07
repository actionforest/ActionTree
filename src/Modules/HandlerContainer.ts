/**
 * @file HandlerContainer
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Task, TaskHandler, TransitionFunction, TransitionHandler} from "./TaskHandler";
import {InternalLogger} from "./InternalLogger";


export class HandlerContainer {
  private tasks: Map<string, TaskHandler>
  private abstract: Map<string, TransitionFunction>

  constructor(private internalLogger: InternalLogger){
    this.tasks = new Map()
    this.abstract = new Map()
  }

  addHandler(task: Task){
    let taskHandler: TaskHandler = new TaskHandler(task, this.getAbstract.bind(this), this.abstract.keys())
    this.internalLogger.info('log',`Registering Task ${taskHandler.getName()}`)
    return this.tasks.set(taskHandler.getName(), taskHandler)
  }

  getHandler(name: string): TaskHandler {
    return this.tasks.get(name)
  }

  addAbstract(name: string, handler: TransitionFunction){
    this.abstract.set(name, handler)
  }
  hasAbstract(name: string){
    return this.abstract.has(name)
  }
  getAbstract(name: string){
    return this.abstract.get(name)
  }
}