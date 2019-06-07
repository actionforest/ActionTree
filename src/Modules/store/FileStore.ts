/**
 * @file FileStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Bluebird from 'bluebird'
import {Store, TaskSettings, TaskUpdate, TransitionUpdate} from "./Store"
import {defaultTask, defaultTransition, pruneTaskRetVal, reduceObjProps, UTCNow} from "./StoreHelpers"
import {ensureDirSync, readJson, writeJson} from "fs-extra"
import {join} from 'path'
import {v4} from 'uuid'
import {find, cloneDeep, reduce} from "lodash/fp";
import moment from "moment";


export class FileStore implements Store {

  dirPath: string

  constructor(dirPath: string) {
    this.dirPath = dirPath
    ensureDirSync(this.dirPath)
  }

  private jsonPath(toJoin: string) : string{
    return join(this.dirPath, `${toJoin}.json`)
  }

  createTask(taskSettings: TaskSettings) {
    let uuid = v4()
    let t = defaultTask(uuid, taskSettings)
    return writeJson(this.jsonPath(uuid),t, {spaces: 2})
      .then((res) => {
        return t
      })
  }

  getTask(taskUuid: string, allData?: boolean) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let retVal = allData ? task : pruneTaskRetVal(task)
        return retVal
      })
  }

  updateTask(taskUuid: string, updateData: TaskUpdate) {

    let storePath = this.jsonPath(taskUuid)
    let update
    return this.getTask(taskUuid, true)
      .then((data) => {
        updateData.updated_at = UTCNow()
        update = reduceObjProps<TaskUpdate>(data, updateData)
        return writeJson(storePath, update, {spaces: 2})
      })
      .then(() => {
        return update
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let storePath = this.jsonPath(taskUuid)
    let uuid = v4()
    let tr = defaultTransition(transitionName, uuid, stateUuid, transitionNumber)

    return readJson(storePath)
      .then((data) => {
        data.current_transition = transitionNumber
        data.transitions[uuid] = tr
        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return tr
      })
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.transitions[transitionUuid]
      })
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {
    let storePath = this.jsonPath(taskUuid)
    let update
    return readJson(storePath)
      .then((task) => {
        let transition = task.transitions[transitionUuid]
        updateData.updated_at = UTCNow()
        update = reduceObjProps<TransitionUpdate>(transition, updateData)
        task.transitions[transitionUuid] = update
        return writeJson(storePath, task, {spaces: 2})
      })
      .then(() => {
        return update
      })
  }

  findTransition(taskUuid: string, ordinal: number){
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return find({ordinal: ordinal}, data.transitions) || null
      })
  }

  createState(taskUuid: string, state: any) {
    let storePath = this.jsonPath(taskUuid)
    let uuid = v4()
    let n = UTCNow()

    let stateObj = {
      uuid: uuid,
      state: state,
      created_at: n,
      updated_at: n
    }

    return readJson(storePath)
      .then((data) => {
        data.states[uuid] = stateObj
        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return stateObj
      })
  }

  getState(taskUuid: string, stateUuid: string) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.states[stateUuid]
      })
  }

  createLog(taskUuid: string, transitionUuid: string, messages: {level: string, message: string}[]){
    let n = UTCNow()
    let storePath = this.jsonPath(taskUuid)
    let toInsert
    return readJson(storePath)
      .then((data) => {
        toInsert = reduce((acc, item) => {
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


        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return toInsert
      })
  }

  closeStore(){
    return Promise.resolve({closed: true, error: null})
  }
}