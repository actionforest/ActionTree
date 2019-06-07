/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, Task, PGStore, MemoryStore} from "../../src";
import {RetryError} from "../../test_mocks/tasks";
import {PgStoreFromEnv} from "../../test_mocks/helpers";

describe('Retry Crashed Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  afterAll(() => {
    localstore.closeStore()
  });

  test('Handles runtime errors correctly.', async () => {
    let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    let retryErrorTask: Task = RetryError()
    let taskData = {
      metadata: {
        name: 'retryError',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        expect(stats).toEqual(expect.objectContaining({error: true, result: 'requeue'}))
        let retry = await actionTree.runTask(requeueData)
        expect(retry).toEqual(expect.objectContaining({
          name: 'retryError',
          type: 'ResumeError',
          error: false,
          transitions: 23
        }))
      }),
      success: jest.fn(async (stats, requeueData) => {
        expect(stats).toEqual(expect.objectContaining({
          name: 'retryError',
          type: 'ResumeError',
          error: false,
          transitions: 23
        }))
      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerTask(retryErrorTask)
    await actionTree.runTask(taskData)

  })
  test('Throwing in a hook is bad.', async () => {
    let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    let retryErrorTask: Task = RetryError()
    let taskData = {
      metadata: {
        name: 'retryError',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn((stats, requeueData) => {
        throw new Error('Oops.')
      }),
      success: jest.fn((stats, requeueData) => {
      }),
      failure: jest.fn((stats, requeueData) => {

      })
    }
    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerTask(retryErrorTask)

    let result = await actionTree.runTask(taskData)

    expect(taskHooks.requeue.mock.calls.length).toEqual(1)
    expect(taskHooks.requeue.mock.results[0].type).toEqual('throw')
    expect(result).toEqual(expect.objectContaining({
      name: 'retryError',
      type: 'Fresh',
      error: true,
      transitions: 10,
      result: 'requeue'
    }))
  })
})