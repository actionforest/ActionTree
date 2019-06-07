/**
 * @file TaskState
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

/**
 * @file MemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {MemoryStore} from "../src/Modules/store/MemoryStore";
import {FileStore} from "../src/Modules/store/FileStore";
import {map} from 'lodash/fp'
import {Store} from "../src/Modules/store";
import {hasEnvs, PgStoreFromEnv} from "../test_mocks/helpers";
import {TaskState} from "../src/Modules/TaskState"

const TestStorage: Store[] = [
  new MemoryStore(),
  new FileStore(`${process.cwd()}/fileStore`),
]

if (hasEnvs()) {
  TestStorage.push(PgStoreFromEnv())
}

let defaultTask = {
  name: 'MyTask',
  complete: false,
  suspended: false,
  error: false,
  aborted: false,
  abort_error: null,
  requeue_count: 0,
  retry_attempts: 0,
  current_transition: 0,
  // transitions: {},
  // transitions: {}
}

let defaultTransition = {
  name: 'doWork',
  ordinal: 1,
  complete: false,
  error: null,
  destination: null,
  wait: null,
  ending_state: null
}

afterAll(() => {
  if (TestStorage.length === 3) {
    TestStorage[2].closeStore()
  }
});

describe('Storage Interfaces', () => {
  map((store: Store) => {
    test(`${store.constructor.name}`, async () => {



      let createTask = await store.createTask({name: 'MyTask', retriesRemaining: 5})
      let taskState = new TaskState(createTask)

      expect(createTask.created_at).toBeTruthy()
      expect(createTask.ended_at).toBeFalsy()
      expect(createTask.created_at).toEqual(createTask.updated_at)
      expect(createTask).toEqual(expect.objectContaining(defaultTask))

      let getTask = await store.getTask(createTask.uuid, true)
      taskState.update(getTask)

      expect(getTask.created_at).toBeTruthy()
      expect(getTask.ended_at).toBeFalsy()
      expect(getTask.created_at).toEqual(getTask.updated_at)
      expect(getTask).toEqual(expect.objectContaining(defaultTask))

      // @ts-ignore - Needed to test proper function
      let updateTask = await store.updateTask(createTask.uuid, {
        complete: true,
        current_transition: count => count + 1,
        // @ts-ignore - Needed to test proper function
        bob: true
      })

      expect(updateTask.created_at).toBeTruthy()
      expect(updateTask.ended_at).toBeFalsy()
      expect(updateTask.created_at).not.toEqual(updateTask.updated_at)
      expect(updateTask).toEqual(expect.objectContaining({complete: true, current_transition: 1}))

    })
  }, TestStorage)
})