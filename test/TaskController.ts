/**
 * @file TaskController
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */


import {TaskController, PendingTask} from "../src";


describe('TaskController Usage', () => {

  test('Fresh Task', async () => {
    let taskData: PendingTask = {
      metadata: {
        name: 'testTask',
        error: false
      },
      state: {
        count: 20
      }
    }
    let td = new TaskController(taskData)

    td.update({retriesRemaining: 1})

    expect(td.getName()).toEqual('testTask')
    expect(td.getError()).toBeNull()

    td.setUuid('bob')
    expect(td.uuid).toEqual('bob')
    expect(td.getUuid()).toEqual('bob')
    expect(()=>{ td.setUuid('derp')}).toThrow()

    // expect(td.setTransitionName('doWork')).toEqual('doWork')
    expect(td.update({transitionName: 'doWork'}).transitionName).toEqual('doWork')
    expect(td.getTransitionName()).toEqual('doWork')

    // expect(td.setCurrentTransition(20)).toEqual(20)
    expect(td.update({currentTransition: 20}).currentTransition).toEqual(20)
    expect(td.getCurrentTransition()).toEqual(20)
    expect(td.incrementCurrentTransition()).toEqual(21)

    let payload = td.getPayload()
    expect(payload).toEqual({count: 20})
    td.update({currentState: {count:21}})
    // td.setState({count: 21})
    expect(td.getState()).toEqual({count: 21})
  })

  test('Immutable state', () => {
    let taskData: PendingTask = {
      metadata: {
        name: 'testTask',
        error: true
      },
      state: {
        count: 20
      }
    }

    let td = new TaskController(taskData)
    let s = td.getPayload()
    expect(s).toEqual({count: 20})
    s.count = 200
    expect(s).toEqual({count: 200})
    expect(td.getPayload()).toEqual({count: 20})
    // td.setState(s)
    td.update({currentState: s})
    expect(td.getState()).toEqual({count: 200})
  })

  test('Fresh task type', async () => {
    let taskData: PendingTask = {
      metadata: {
        name: 'testTask',
        error: true
      },
      state: {
        count: 20
      }
    }

    let td = new TaskController(taskData)
    expect(td.getType()).toEqual('Fresh')
  })

  test('Resume task type', async () => {
    let taskData: PendingTask = {
      metadata: {
        name: 'testTask',
        uuid: 'bob',
        error: false
      },
      state: {
        count: 20
      }
    }

    let td = new TaskController(taskData)
    expect(td.getType()).toEqual('ResumeSuspended')
  })

  test('Retry Error task type', async () => {
    let taskData: PendingTask = {
      metadata: {
        name: 'testTask',
        uuid: 'bob',
        error: true
      },
      state: {
        count: 20
      }
    }

    let td = new TaskController(taskData)
    expect(td.getType()).toEqual('ResumeError')
  })

})