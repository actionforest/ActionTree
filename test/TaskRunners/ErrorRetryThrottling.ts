import {ActionTree, MemoryStore, Task} from "../../src";
import {CrashingTask} from "../../test_mocks/tasks";

/**
 * @file ErrorRetryThrottling
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

describe('Repeatedly crashing Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()
  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   localstore.closeStore()
  // });

  test('Stops attempting to retry runtime errors after count is exceeded', async () => {
    let actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    let crashingTask: Task = CrashingTask(2)
    let taskData = {
      metadata: {
        name: 'crashingTask',
        uuid: null
      },
      state: {
        count: 20
      }
    }

    let expectedStats = {
      name: 'crashingTask',
      transitions: 1,
      type: 'Fresh'
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        let result = await actionTree.runTask(requeueData)

      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {
      })
    }

    actionTree.registerTaskHooks(taskHooks)
    actionTree.registerTask(crashingTask)


    let result = await actionTree.runTask(taskData)
    expect(result).toEqual(expect.objectContaining(expectedStats))
    expect(result.error).toBeTruthy()

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls
    expect(requeueMockCalls.length).toEqual(2)
    expect(failureMockCalls.length).toEqual(1)
    expect(successMockCalls.length).toEqual(0)

    let stats1 = requeueMockCalls[0][0]
    let requeue1 = requeueMockCalls[0][1]
    let stats2 = requeueMockCalls[1][0]
    let requeue2 = requeueMockCalls[1][1]
    expect(stats1).toEqual(expect.objectContaining(expectedStats))
    expect(requeue1.metadata).toEqual(expect.objectContaining({name: 'crashingTask', error: true}))

  }, 1000 * 60 * 5)

})