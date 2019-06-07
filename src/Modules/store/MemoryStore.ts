/**
 * @file MemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Bluebird from 'bluebird'
import {Store, TaskUpdate, TransitionUpdate, TaskSettings} from "./Store"
import {defaultTask, defaultTransition, pruneTaskRetVal, reduceObjProps, UTCNow} from "./StoreHelpers"
import {v4} from 'uuid'
import {sortBy, filter, first, last, has, each, find, reduce} from "lodash/fp";
import moment from "moment";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export class MemoryStore implements Store {

  private Tasks: Map<string, any>

  constructor() {
    this.Tasks = new Map()
  }

  createTask(taskSettings: TaskSettings) {
    let uuid = v4()
    let t = defaultTask(uuid, taskSettings)
    this.Tasks.set(uuid, t)
    return Promise.resolve(t)
  }

  getTask(taskUuid: string, allData?: boolean) {
    let task = this.Tasks.get(taskUuid)
    let retVal = allData ? task : pruneTaskRetVal(task)
    return Promise.resolve(retVal)
  }

  updateTask(taskUuid: string, updateData: TaskUpdate) {
    return this.getTask(taskUuid, true)
      .then((data) => {
        updateData.updated_at = UTCNow()
        data = reduceObjProps<TaskUpdate>(data, updateData)
        return Promise.resolve(data)
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let uuid = v4()
    let tr = defaultTransition(transitionName, uuid, stateUuid, transitionNumber)

    let task = this.Tasks.get(taskUuid)
    task.transitions[uuid] = tr
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(tr)
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    return Promise.resolve(transition)
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {
    return this.getTransition(taskUuid, transitionUuid)
      .then((data) => {
        updateData.updated_at = UTCNow()
        data = reduceObjProps<TransitionUpdate>(data, updateData)
        return data
      })
  }

  findTransition(taskUuid: string, ordinal: number){
    let task = this.Tasks.get(taskUuid)
    let tr = find({ordinal: ordinal}, task.transitions) || null
    return Promise.resolve(tr)
  }

  createState(taskUuid: string, state: any) {
    let uuid = v4()
    let n = UTCNow()
    let stateObj = {
      uuid: uuid,
      state: state,
      created_at: n,
      updated_at: n
    }

    let task = this.Tasks.get(taskUuid)
    task.states[uuid] = stateObj
    return Promise.resolve(stateObj)
  }

  getState(taskUuid: string, stateUuid: string) {
    let task = this.Tasks.get(taskUuid)
    return Promise.resolve(task.states[stateUuid])
  }

  createLog(taskUuid: string, transitionUuid: string, messages: {level: string, message: string}[]){
    let n = UTCNow()
    return this.getTask(taskUuid, true)
      .then((data) => {
        let toInsert = reduce((acc, item) => {
          let uuid = v4()
          acc.push({
            uuid: uuid,
            task_uuid: taskUuid,
            transition_uuid: transitionUuid,
            message: item.message,
            level: item.level,
            created_at: n,
            updated_at: n,
            deleted_at: null
          })
          return acc
        }, [], messages)

        reduce((acc, item) => {
          acc[item.uuid] = item
          return acc
        }, data.log, toInsert)

        return toInsert
      })
  }

  closeStore(){
    return Promise.resolve({closed: true, error: null})
  }
}