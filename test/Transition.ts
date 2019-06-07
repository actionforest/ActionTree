/**
 * @file Transition
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Transition, TransitionParams} from '../src/Modules/Transition'
import {Task, TaskController} from "../src";
import {TaskHandler} from "../src";
import {MemoryStore} from "../src";
import {InternalLogger} from '../src/Modules/InternalLogger'

const buildParams = async ({store, controller, stateChange, startingState, endingState, destination, fn}) => {
  if(!fn){
    fn = (State, taskController) => {
      return [destination, endingState]
    }
  }
  let handler: Task = {
    config: {
      name: 'SimpleTask',
      initial: 'first',
      retryLimit: 1
    },
    transitions: {
      first: fn
    }
  }

  let abstract = new Map()
  let getAbstract = (name: string) => {
    return undefined
  }

  let th = new TaskHandler(handler, getAbstract, abstract.keys())
  let tc = new TaskController(controller)

  let ct = await store.createTask({
    name: tc.getName(),
    retriesRemaining: th.getConfig().retryLimit,
    retryDelay: th.getConfig().retryDelay
  })

  let st = await store.createState(ct.uuid, startingState)
  tc.update({
    uuid: ct.uuid,
    currentTransition: ct.current_transition,
    retriesRemaining: ct.retries_remaining,
    retryDelay: ct.retry_delay,
    currentState: st
  })

  let trParams: TransitionParams =  {
    taskHandler: th,
    taskController: tc,
    stateChange: stateChange,
    Store: store,
    internalLogger: new InternalLogger({debugLogging: false, infoLogging: false})

  }
  return trParams
}

describe('Transition', () => {
  // let s = new FileStore(`${process.cwd()}/fileStore`)
  let s: MemoryStore = new MemoryStore()
  // let s: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   s.closeStore()
  // });
  test('nominal', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {initial: true},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second'},
      fn: false
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()
    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: true,
      error: false,
      error_stack: null,
      destination: 'second',
      requeue: null,
      wait: 0,
    }))

  })

  test('In task wait', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {to: 'first'},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second', wait: 1000},
      fn: false
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()
    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: true,
      error: false,
      error_stack: null,
      destination: 'second',
      requeue: null,
      wait: 1000,
    }))

  })
  test('requeue', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {to: 'first'},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second', requeue: true},
      fn: false
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()
    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: true,
      error: false,
      error_stack: null,
      destination: 'second',
      requeue: true,
      wait: 0,
    }))

  })

  test('requeue wait', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {to: 'first'},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second', requeue: true, wait: 1000},
      fn: false
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()
    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: true,
      error: false,
      error_stack: null,
      destination: 'second',
      requeue: true,
      wait: 1000,
    }))

  })

  test('throws in handler', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {to: 'first'},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second', requeue: true, wait: 1000},
      fn: (State, taskController) => {
        throw new Error('Derp')
      }
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()
    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: false,
      error: true,
      destination: 'error',
      requeue: null,
      wait: 0,
    }))

  })
  test('rejects in handler', async () => {

    let task = {
      metadata: {
        name: 'freshTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }
    let p = {
      store: s,
      controller: task,
      stateChange: {to: 'first'},
      startingState: {ok: 1},
      endingState: {ok: 2},
      destination: {to: 'second', requeue: true, wait: 1000},
      fn: (State, taskController) => {
        return Promise.reject(new Error('Derp'))
      }
    }
    let transitionParams: TransitionParams = await buildParams(p)
    let t = new Transition(transitionParams)
    let r = await t.run()

    expect(r).toEqual(expect.objectContaining({
      name: 'first',
      ordinal: 0,
      complete: false,
      error: true,
      destination: 'error',
      requeue: null,
      wait: 0,
    }))

  })
})