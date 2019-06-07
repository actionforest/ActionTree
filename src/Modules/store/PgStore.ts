/**
 * @file PgStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import Knex from 'knex';
import {Config as KnexConfig, PoolConfig, Client} from 'knex'
import {Store, TaskSettings, TaskUpdate, TransitionUpdate} from "./Store"

import {
  reduceObjProps,
  simpleDefaultTask,
  simpleDefaultTransition, UTCNow
} from "./StoreHelpers";
import {reduce} from "lodash/fp";
import {v4} from "uuid";

export interface SimplePGConfig {
  user: string,
  host: string,
  password: string,
  database: string
  poolMin: number,
  poolMax: number,
  debug?: boolean
}

function isClient(arg: any): arg is Knex {
  return arg.Promise && arg.Promise.version
}

function isSimplePGConfig(arg: any): arg is SimplePGConfig {
  return (arg.poolMin || arg.poolMax)
}

function isKnexConfig(arg: any): arg is KnexConfig {
  return (arg.type !== undefined && arg.connection)
}

export class PGStore implements Store {
  id: number
  uuid: string
  private client: Knex

  constructor(clientOrConfig: SimplePGConfig | KnexConfig | Client) {

    if(isSimplePGConfig(clientOrConfig)){
      this.client = Knex({
        client: 'pg',
        connection: {
          user: clientOrConfig.user,
          host: clientOrConfig.host,
          password: clientOrConfig.password,
          database: clientOrConfig.database
        },
        pool: {
          min: clientOrConfig.poolMin,
          max: clientOrConfig.poolMax
        },
        debug: !!clientOrConfig.debug
      })
      return
    }

    if(isKnexConfig(clientOrConfig)){
      this.client = Knex(clientOrConfig)
      return
    }

    if(isClient(clientOrConfig)){
      this.client = clientOrConfig
      return
    }

  }

  createTask(taskSettings: TaskSettings) {
    let t = simpleDefaultTask(taskSettings)
    return this.client('subexigent_task')
      .insert(t)
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getTask(taskUuid: string, allData?: boolean) {
    return this.client('subexigent_task')
      .where({uuid: taskUuid})
      .then((data) => {
        return data[0]
      })
  }
  updateTask(taskUuid: string, updateData: TaskUpdate) {
    let update
    return this.getTask(taskUuid, true)
      .then((data) => {
        update = reduceObjProps<TaskUpdate>(data, updateData)
        return this.client('subexigent_task')
          .where({uuid: taskUuid})
          .returning('*')
          .update(update)
      })
      .then((data) => {
        return data[0]
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let tr = simpleDefaultTransition(transitionName, stateUuid, transitionNumber)
    tr.task_uuid = taskUuid
    return this.client('subexigent_transition')
      .insert(tr)
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    return this.client('subexigent_transition')
      .where({uuid: transitionUuid})
      .then((data) => {
        return data[0]
      })
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {

    let update
    return this.getTransition(taskUuid, transitionUuid)
      .then((data) => {
        update = reduceObjProps<TaskUpdate>(data, updateData)
        return this.client('subexigent_transition')
          .where({uuid: transitionUuid})
          .returning('*')
          .update(update)
      })
      .then((data) => {
        return data[0]
      })
  }

  findTransition(taskUuid: string, ordinal: number){

    return this.client('subexigent_transition')
      .where({task_uuid: taskUuid, ordinal: ordinal})
      .then((data) => {

        return data[0] || null
      })
  }

  createState(taskUuid: string, state: any) {

    return this.client('subexigent_state')
      .insert({task_uuid: taskUuid, state: state})
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getState(taskUuid: string, stateUuid: string) {
    return this.client('subexigent_state')
      .where({uuid: stateUuid})
      .then((data) => {
        return data[0]
      })
  }

  createLog(taskUuid: string, transitionUuid: string, messages: {level: string, message: string}[]){
    let toInsert = reduce((acc, item) => {
      acc.push({
        task_uuid: taskUuid,
        transition_uuid: transitionUuid,
        message: item.message,
        level: item.level
      })
      return acc
    }, [], messages)

    return this.client('subexigent_log')
      .insert(toInsert)
      .returning('*')
      .then((data) => {
        return data
      })

  }

  closeStore(){
    return this.client.destroy()
      .then(() => {
        return {closed: true, error: null}
      })
      .catch((err) => {
        return {closed: false, error: err}
      })
  }

}