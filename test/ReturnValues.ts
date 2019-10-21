import {ActionTree, FileStore, Task} from "../src";
import {SimpleResume} from "../test_mocks/tasks/SimpleResume";

/**
 * @file ReturnValues
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


describe('Success Retry and Error return values.', () => {
  let localstore = new FileStore(`${process.cwd()}/fileStore`)
  // let localstore: MemoryStore = new MemoryStore()

  // let localstore: PGStore = PgStoreFromEnv()
  // afterAll(() => {
  //   localstore.closeStore()
  // });


  test('Requeue', async () => {
    let actiontree: ActionTree = new ActionTree(localstore, {debugLogging: false, infoLogging: false})
    let simpleResume: Task = SimpleResume
    let taskData = {
      metadata: {
        name: 'SimpleResume',
        uuid: null
      },
      state: {
        ok: true
      }
    }

    let expected = {
      name: 'SimpleResume',
      transitions: 1,
      error: false,
      type: 'Fresh',
      result: 'requeue',
      state: {},
      callerMetadata: {},
      retryDelay: 1000
    }

    let requeueExpected = {
      name: 'SimpleResume',
      transitions: 22,
      error: false,
      type: 'ResumeSuspended',
      result: 'success',
      retryDelay: 1000
    }

    let taskHooks = {
      requeue: jest.fn(async (stats, requeueData) => {
        let result = await actiontree.runTask(requeueData)
        // expect(result).toEqual(expect.objectContaining(requeueExpected))
      }),
      success: jest.fn(async (stats, requeueData) => {

      }),
      failure: jest.fn(async (stats, requeueData) => {

      })
    }


    actiontree.registerTaskHooks(taskHooks)
    actiontree.registerTask(simpleResume)
    let result = await actiontree.runTask(taskData)
    expect(result).toEqual(expect.objectContaining(expected))

    let requeueMockCalls = taskHooks.requeue.mock.calls
    let failureMockCalls = taskHooks.failure.mock.calls
    let successMockCalls = taskHooks.success.mock.calls

    expect(requeueMockCalls.length).toEqual(3)
    expect(failureMockCalls.length).toEqual(0)
    expect(successMockCalls.length).toEqual(1)

  })

})