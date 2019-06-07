/**
 * @file SubExigent
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, PendingTask, Task, PGStore, MemoryStore} from "../src";
import {PgStoreFromEnv} from "../test_mocks/helpers";

let taskHandler: Task = {
  config: {
    name: 'testTask',
    initial: 'doWork',
    retryOnError: true,
    retryDelay: 1000,
    delayMultiplier: 0.1
  },
  transitions: {
    doWork: (State, Metadata) => {
      State.count -= 1
      return [{to: 'checkWork', wait: 200}, State]
    },
    checkWork: (State, Metadata) => {
      if(State.count <= 0){
        return [{to: 'done'}, State]
      }
      if(State.count === 1 && State.shouldThrow){
        throw new Error('You done goofed')
      }
      return [{to: 'doWork'}, State]
    }
  }
}

let taskData: PendingTask = {
  metadata: {
    name: 'testTask'
  },
  state: {
    count: 5
  }
}

let faketask: PendingTask = {
  metadata: {
    name: 'fakeTask'
  },
  state: {
    count: 5
  }
}

describe('ActionTree Basic usage', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  afterAll(() => {
    localstore.closeStore()
  });
  test('Instantiation', async () => {
    let e = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    e.registerTask(taskHandler)
    let ran = await e.runTask(taskData)

    let closed = await e.closeStore()
    expect(closed).toEqual(expect.objectContaining({closed: true, error: null}))
  })

  test('Missing task', async () => {
    let e = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    e.registerTask(taskHandler)

    expect(e.runTask(faketask)).rejects.toEqual(new Error('No task found with the name fakeTask'))
  })
})