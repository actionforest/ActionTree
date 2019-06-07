/**
 * @file AbstractHandlers
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

  test('Runs abstract transitions correctly.', async () => {
    let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})

    let first = jest.fn((State, taskController) => {
      return [{to: 'abstract_ok', requeue: true, wait: 1000}, {}]
    })

    let SimpleAbstract: Task = {
      config: {
        name: 'SimpleAbstract',
        initial: 'first',
        retryLimit: 1,
        abstractHandlers: ['abstract_ok']
      },
      transitions: {
        first
      }
    }

    let taskData = {
      metadata: {
        name: 'SimpleAbstract',
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

    let abstractFn: any  = jest.fn((State, taskController) => {
      return [{to: 'done'},State] })
    let abstractNo: any  = jest.fn((State, taskController) => {
      return [{to: 'done'},State] })

    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerAbstract('abstract_ok', abstractFn)
    actionTree.registerAbstract('abstract_no', abstractNo)
    actionTree.registerTask(SimpleAbstract)


    let result = await actionTree.runTask(taskData)

    expect(result.name).toEqual('SimpleAbstract')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeFalsy()
    expect(result.transitions).toEqual(1)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(1)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)

    expect(first.mock.calls.length).toEqual(1)
    expect(abstractFn.mock.calls.length).toEqual(1)
    expect(abstractNo.mock.calls.length).toEqual(0)

  }, 1000 * 60 * 5)

  test('Handles incorrect abstract', () => {
    let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})

    let CrashAbstract: Task = {
      config: {
        name: 'CrashAbstract',
        initial: 'first',
        retryLimit: 1,
        abstractHandlers: ['abstract_ok']
      },
      transitions: {
        toDone: (State, taskController) => {
          return [{to: 'abstract_ok', requeue: true, wait: 1000}, {}]
        }
      }
    }

    let taskData = {
      metadata: {
        name: 'CrashAbstract',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    expect(() => {
      actionTree.registerTask(CrashAbstract)
    }).toThrow()

  })

  test('Registering tasks with abstract before registering tasks crashes.', () => {
    let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})

    let NoAbstract: Task = {
      config: {
        name: 'NoAbstract',
        initial: 'first',
        retryLimit: 1,
      },
      transitions: {
        toDone: (State, taskController) => {
          return [{to: 'done', requeue: true, wait: 1000}, {}]
        }
      }
    }

    let taskData = {
      metadata: {
        name: 'NoAbstract',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    //
    // actionTree.registerAbstract('abstract_no', abstractNo)
    actionTree.registerTask(NoAbstract)

  })

})