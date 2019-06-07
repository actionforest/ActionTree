/**
 * @file StateTable
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {StateTable} from "../src/Modules/StateTable"


describe('State Object Hash Table', () => {

  test('Hashing objects', () => {
    let derp = new StateTable()

    let a = {a: 1, b: 2}
    derp.set(a, 'abc')
    derp.set(a, 'def')
    let b = {a: 1, b: 2}
  })
})