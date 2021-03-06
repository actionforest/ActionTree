/**
 * @file PersistantLogger
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import {Store} from "./store";
import {map, isObject, isFunction} from 'lodash/fp'
import {InternalLogger} from "./InternalLogger";

function decycle(object: any, replacer?: any) {

// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form

//      {"$ref": PATH}

// where the PATH is a JSONPath string that locates the first occurance.

// So,

//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));

// produces the string '[{"$ref":"$"}]'.

// If a replacer function is provided, then it will be called for each value.
// A replacer function receives a value and returns a replacement value.

// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child element or
// property.

  var objects = new WeakMap();     // object to path mappings

  return (function derez(value, path) {

// The derez function recurses through the object, producing the deep copy.

    var old_path;   // The path of an earlier occurance of value
    var nu;         // The new object or array

// If a replacer function was provided, then call it to get a replacement value.

    if (replacer !== undefined) {
      value = replacer(value);
    }

// typeof null === "object", so go on if this value is really an object but not
// one of the weird builtin objects.

    if (
      typeof value === "object" && value !== null &&
      !(value instanceof Boolean) &&
      !(value instanceof Date) &&
      !(value instanceof Number) &&
      !(value instanceof RegExp) &&
      !(value instanceof String)
    ) {

// If the value is an object or array, look to see if we have already
// encountered it. If so, return a {"$ref":PATH} object. This uses an
// ES6 WeakMap.

      old_path = objects.get(value);
      if (old_path !== undefined) {
        return {$ref: old_path};
      }

// Otherwise, accumulate the unique value and its path.

      objects.set(value, path);

// If it is an array, replicate the array.

      if (Array.isArray(value)) {
        nu = [];
        value.forEach(function (element, i) {
          nu[i] = derez(element, path + "[" + i + "]");
        });
      } else {

// If it is an object, replicate the object.

        nu = {};
        Object.keys(value).forEach(function (name) {
          nu[name] = derez(
            value[name],
            path + "[" + JSON.stringify(name) + "]"
          );
        });
      }
      return nu;
    }
    return value;
  }(object, "$"));
}

export interface LogCache {
  log(): void
  warn(): void
  info(): void
  error(): void
  transform(): {level: string, message: string}[]
}
export const LogCacheFactory = (internalLogger: InternalLogger): LogCache => {
  let messages = []
  let doLog = (level, args)=>{

    internalLogger.info.apply(internalLogger, [level,...args])
    let levelAssociated = map((message) => {
      return {level: level, message: message}
    }, args)
    Array.prototype.push.apply(messages, levelAssociated)

  }
  return {
    log: (...args) => {
      doLog('log', args)
    },
    warn: (...args) => {
      doLog('warn', args)
    },
    info: (...args) => {
      doLog('info', args)
    },
    error: (...args) => {
      doLog('error', args)
    },
    transform: (): {level: string, message: string}[] => {
      return map((item) => {
        if(isObject(item.message)){
          try {
            if(isFunction(item.message)){
              throw new Error('Cannot stringify a function.')
            }
            item.message = JSON.stringify(decycle(item.message))
          }
          catch(e){
            item.message = `Error: ${e.message}`
          }
        }

        return item
      }, messages)
    }
  }
}
