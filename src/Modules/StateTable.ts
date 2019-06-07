/**
 * @file StateTable
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {sha1} from 'object-hash'

export class StateTable {
    private table: Map<string, string>
    constructor(){
      this.table = new Map()
    }

    has(key: any){
      let hash = sha1(key)
      return this.table.has(key)
    }
    set(key: any, value: string){
      let hash = sha1(key)
      if(this.table.has(hash)){

        return this.table.get(hash)
      }
      this.table.set(hash, value)
      return value

    }

    get(key: any){
      let hash = sha1(key)
      return this.table.get(hash)
    }
}