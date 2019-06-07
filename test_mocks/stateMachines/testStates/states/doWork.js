"use strict";

exports.doWork = function() {
  return function(State){
    let newState = State
    return [{to: 'nextState'}, newState]
  }
}