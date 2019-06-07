/**
 * @file CrashingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, FileStore,Task} from "../../src";
import {CrashingTask} from "../../test_mocks/tasks";

describe('Crashing Task', () => {
  let localstore = new FileStore(`${process.cwd()}/fileStore`)
  // let localstore: MemoryStore = new MemoryStore()
  // let localstore: PGStore = PgStoreFromEnv()
  let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
  let crashingTask: Task = CrashingTask()

  test('Handles runtime errors correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'crashingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {

      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }
    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerTask(crashingTask)

    let result = await actionTree.runTask(taskData)
    expect(result.name).toEqual('crashingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeTruthy()
    expect(result.transitions).toEqual(1)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(1)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(0)
  })
})