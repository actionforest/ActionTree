/**
 * @file PersistantLogging
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, MemoryStore, Task} from "../src";
import {PersistantLogging} from "../test_mocks/tasks";

describe('Persistant Logging from task transition.', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //     localstore.closeStore()
  // });

  let  subex: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
  let basicTask: Task = PersistantLogging

  test('Runs task to completion.', async () => {

    let taskData = {
      metadata: {
        name: 'persistantLogging',
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

    subex.registerTaskHooks(taskHooks)
    subex.registerTask(basicTask)

    let result = await subex.runTask(taskData)

    expect(result.name).toEqual('persistantLogging')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toBeFalsy()
    expect(result.transitions).toEqual(2)

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(0)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)
  })
})