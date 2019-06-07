/**
 * @file server
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import express from 'express'
import * as mainController from "./controllers/main";
import {join} from 'path'

const dashboard = express()

dashboard.set("port", 8080)
dashboard.set("views", join(__dirname, '../views'))
dashboard.set("view engine", "pug");

dashboard.get('/', mainController.index)


dashboard.listen(dashboard.get('port'), () => {
  console.log('SubExigent dashboard running on local port')
})