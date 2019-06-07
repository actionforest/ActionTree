/**
 * @file helpers
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {PGStore} from "../src/Modules/store";

  // console.log(process.env.SUBEXIGENT_DB_USER,
  // process.env.SUBEXIGENT_DB_HOST,
  // process.env.SUBEXIGENT_DB_PASSWORD,
  // process.env.SUBEXIGENT_DB_DATABASE)

let pgEnvConf = {
  user: process.env.SUBEXIGENT_DB_USER,
  host: process.env.SUBEXIGENT_DB_HOST,
  password: process.env.SUBEXIGENT_DB_PASSWORD,
  database: process.env.SUBEXIGENT_DB_DATABASE,
  poolMin: 1,
  poolMax: 1,
  debug: false
}

let memoStore: PGStore

export const hasEnvs = (): boolean => {
    return (
      !!process.env.SUBEXIGENT_DB_USER &&
      !!process.env.SUBEXIGENT_DB_HOST &&
      !!process.env.SUBEXIGENT_DB_PASSWORD &&
      !!process.env.SUBEXIGENT_DB_DATABASE
    )
}

export const PgStoreFromEnv = (): PGStore =>{
  if(memoStore){
    return memoStore
  }
  memoStore = new PGStore(pgEnvConf)
  return memoStore
}