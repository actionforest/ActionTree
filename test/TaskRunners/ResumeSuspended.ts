/**
 * @file RetryError
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, MemoryStore, Task} from "../../src";

describe('Retry Crashed Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   localstore.closeStore()
  // });

  let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})

  let first = jest.fn((State, taskController) => {
    return [{to: 'second', requeue: true, wait: 1000}, {}]
  })

  let second = jest.fn((State, taskController) => {
    return [{to: 'third', requeue: true, wait: 1000}, {}]
  })

  let third = jest.fn((State, taskController) => {
    return [{to: 'fourth', requeue: true, wait: 1000}, {}]
  })

  let fourth = jest.fn((State, taskController) => {
    return [{to: 'done', requeue: true}, {}]
  })

  let resumeSuspendedTask: Task = {
    config: {
      name: 'SimpleResume',
      initial: 'first',
      retryLimit: 1
    },
    transitions: {
      first,
      second,
      third,
      fourth
    }
  }



  test('Handles runtime errors correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'SimpleResume',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        await actionTree.runTask(requeueData)
      }),
      success: jest.fn(async (stats, requeueData) => {
      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerTask(resumeSuspendedTask)


    let result = await actionTree.runTask(taskData)

    expect(result.name).toEqual('SimpleResume')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeFalsy()
    expect(result.transitions).toEqual(1)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(3)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)

    expect(first.mock.calls.length).toEqual(1)
    expect(second.mock.calls.length).toEqual(1)
    expect(third.mock.calls.length).toEqual(1)
    expect(fourth.mock.calls.length).toEqual(1)

  }, 1000 * 60 * 5)
})