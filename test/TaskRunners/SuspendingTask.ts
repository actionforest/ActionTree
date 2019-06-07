/**
 * @file SuspendingTask
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {ActionTree, MemoryStore, Task} from "../../src";
import {SuspendingTask} from "../../test_mocks/tasks";

describe('Suspending Task', () => {
  // let localstore = new FileStore(`${process.cwd()}/fileStore`)
  let localstore: MemoryStore = new MemoryStore()
  let  actionTree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
  let crashingTask: Task = SuspendingTask

  test('Suspends Tasks correctly.', async () => {

    let taskData = {
      metadata: {
        name: 'suspendingTask',
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


    expect(result.name).toEqual('suspendingTask')
    expect(result.type).toEqual('Fresh')
    expect(result.error).toEqual(false)
    expect(result.transitions).toEqual(1)

  })
})