/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This file is generated from kinto.js - do not modify directly.
 */

this.EXPORTED_SYMBOLS = ["loadKinto"];
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.loadKinto = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _base = require("../src/adapters/base");

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

Components.utils.import("resource://gre/modules/Sqlite.jsm"); /*
                                                               * Licensed under the Apache License, Version 2.0 (the "License");
                                                               * you may not use this file except in compliance with the License.
                                                               * You may obtain a copy of the License at
                                                               *
                                                               *     http://www.apache.org/licenses/LICENSE-2.0
                                                               *
                                                               * Unless required by applicable law or agreed to in writing, software
                                                               * distributed under the License is distributed on an "AS IS" BASIS,
                                                               * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                               * See the License for the specific language governing permissions and
                                                               * limitations under the License.
                                                               */

Components.utils.import("resource://gre/modules/Task.jsm");

const statements = {
  "createCollectionData": `
    CREATE TABLE collection_data (
      collection_name TEXT,
      record_id TEXT,
      record TEXT
    );`,

  "createCollectionMetadata": `
    CREATE TABLE collection_metadata (
      collection_name TEXT PRIMARY KEY,
      last_modified INTEGER
    ) WITHOUT ROWID;`,

  "createCollectionDataRecordIdIndex": `
    CREATE UNIQUE INDEX unique_collection_record
      ON collection_data(collection_name, record_id);`,

  "clearData": `
    DELETE FROM collection_data
      WHERE collection_name = :collection_name;`,

  "createData": `
    INSERT INTO collection_data (collection_name, record_id, record)
      VALUES (:collection_name, :record_id, :record);`,

  "updateData": `
    UPDATE collection_data
      SET record = :record
        WHERE collection_name = :collection_name
        AND record_id = :record_id;`,

  "deleteData": `
    DELETE FROM collection_data
      WHERE collection_name = :collection_name
      AND record_id = :record_id;`,

  "saveLastModified": `
    REPLACE INTO collection_metadata (collection_name, last_modified)
      VALUES (:collection_name, :last_modified);`,

  "getLastModified": `
    SELECT last_modified
      FROM collection_metadata
        WHERE collection_name = :collection_name;`,

  "getRecord": `
    SELECT record
      FROM collection_data
        WHERE collection_name = :collection_name
        AND record_id = :record_id;`,

  "listRecords": `
    SELECT record
      FROM collection_data
        WHERE collection_name = :collection_name;`,

  "importData": `
    REPLACE INTO collection_data (collection_name, record_id, record)
      VALUES (:collection_name, :record_id, :record);`

};

const createStatements = ["createCollectionData", "createCollectionMetadata", "createCollectionDataRecordIdIndex"];

const currentSchemaVersion = 1;

class FirefoxAdapter extends _base2.default {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  _init(connection) {
    return Task.spawn(function* () {
      yield connection.executeTransaction(function* doSetup() {
        const schema = yield connection.getSchemaVersion();

        if (schema == 0) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {

            for (var _iterator = createStatements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              const statementName = _step.value;

              yield connection.execute(statements[statementName]);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          yield connection.setSchemaVersion(currentSchemaVersion);
        } else if (schema != 1) {
          throw new Error("Unknown database schema: " + schema);
        }
      });
      return connection;
    });
  }

  _executeStatement(statement, params) {
    if (!this._connection) {
      throw new Error("The storage adapter is not open");
    }
    return this._connection.executeCached(statement, params);
  }

  open() {
    const self = this;
    return Task.spawn(function* () {
      const opts = { path: "kinto.sqlite", sharedMemoryCache: false };
      if (!self._connection) {
        self._connection = yield Sqlite.openConnection(opts).then(self._init);
      }
    });
  }

  close() {
    if (this._connection) {
      const promise = this._connection.close();
      this._connection = null;
      return promise;
    }
    return Promise.resolve();
  }

  clear() {
    const params = { collection_name: this.collection };
    return this._executeStatement(statements.clearData, params);
  }

  execute(callback, options = { preload: [] }) {
    if (!this._connection) {
      throw new Error("The storage adapter is not open");
    }
    const preloaded = options.preload.reduce((acc, record) => {
      acc[record.id] = record;
      return acc;
    }, {});

    const proxy = transactionProxy(this.collection, preloaded);
    let result;
    try {
      result = callback(proxy);
    } catch (e) {
      return Promise.reject(e);
    }
    const conn = this._connection;
    return conn.executeTransaction(function* doExecuteTransaction() {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = proxy.operations[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          const { statement, params } = _step2.value;

          yield conn.executeCached(statement, params);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }).then(_ => result);
  }

  get(id) {
    const params = {
      collection_name: this.collection,
      record_id: id
    };
    return this._executeStatement(statements.getRecord, params).then(result => {
      if (result.length == 0) {
        return;
      }
      return JSON.parse(result[0].getResultByName("record"));
    });
  }

  list() {
    const params = {
      collection_name: this.collection
    };
    return this._executeStatement(statements.listRecords, params).then(result => {
      const records = [];
      for (let k = 0; k < result.length; k++) {
        const row = result[k];
        records.push(JSON.parse(row.getResultByName("record")));
      }
      return records;
    });
  }

  /**
   * Load a list of records into the local database.
   *
   * Note: The adapter is not in charge of filtering the already imported
   * records. This is done in `Collection#loadDump()`, as a common behaviour
   * between every adapters.
   *
   * @param  {Array} records.
   * @return {Array} imported records.
   */
  loadDump(records) {
    const connection = this._connection;
    const collection_name = this.collection;
    return Task.spawn(function* () {
      yield connection.executeTransaction(function* doImport() {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = records[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            const record = _step3.value;

            const params = {
              collection_name: collection_name,
              record_id: record.id,
              record: JSON.stringify(record)
            };
            yield connection.execute(statements.importData, params);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        const lastModified = Math.max(...records.map(record => record.last_modified));
        const params = {
          collection_name: collection_name
        };
        const previousLastModified = yield connection.execute(statements.getLastModified, params).then(result => {
          return result ? result[0].getResultByName('last_modified') : -1;
        });
        if (lastModified > previousLastModified) {
          const params = {
            collection_name: collection_name,
            last_modified: lastModified
          };
          yield connection.execute(statements.saveLastModified, params);
        }
      });
      return records;
    });
  }

  saveLastModified(lastModified) {
    const parsedLastModified = parseInt(lastModified, 10) || null;
    const params = {
      collection_name: this.collection,
      last_modified: parsedLastModified
    };
    return this._executeStatement(statements.saveLastModified, params).then(() => parsedLastModified);
  }

  getLastModified() {
    const params = {
      collection_name: this.collection
    };
    return this._executeStatement(statements.getLastModified, params).then(result => {
      if (result.length == 0) {
        return 0;
      }
      return result[0].getResultByName("last_modified");
    });
  }
}

exports.default = FirefoxAdapter;
function transactionProxy(collection, preloaded) {
  const _operations = [];

  return {
    get operations() {
      return _operations;
    },

    create(record) {
      _operations.push({
        statement: statements.createData,
        params: {
          collection_name: collection,
          record_id: record.id,
          record: JSON.stringify(record)
        }
      });
    },

    update(record) {
      _operations.push({
        statement: statements.updateData,
        params: {
          collection_name: collection,
          record_id: record.id,
          record: JSON.stringify(record)
        }
      });
    },

    delete(id) {
      _operations.push({
        statement: statements.deleteData,
        params: {
          collection_name: collection,
          record_id: id
        }
      });
    },

    get(id) {
      // Gecko JS engine outputs undesired warnings if id is not in preloaded.
      return id in preloaded ? preloaded[id] : undefined;
    }
  };
}

},{"../src/adapters/base":11}],2:[function(require,module,exports){
/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loadKinto;

var _base = require("../src/adapters/base");

var _base2 = _interopRequireDefault(_base);

var _KintoBase = require("../src/KintoBase");

var _KintoBase2 = _interopRequireDefault(_KintoBase);

var _FirefoxStorage = require("./FirefoxStorage");

var _FirefoxStorage2 = _interopRequireDefault(_FirefoxStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Cu = Components.utils;

function loadKinto() {
  const { EventEmitter } = Cu.import("resource://devtools/shared/event-emitter.js", {});

  Cu.import("resource://gre/modules/Timer.jsm");
  Cu.importGlobalProperties(['fetch']);

  class KintoFX extends _KintoBase2.default {
    static get adapters() {
      return {
        BaseAdapter: _base2.default,
        FirefoxAdapter: _FirefoxStorage2.default
      };
    }

    constructor(options = {}) {
      const emitter = {};
      EventEmitter.decorate(emitter);

      const defaults = {
        events: emitter
      };

      const expandedOptions = Object.assign(defaults, options);
      super(expandedOptions);
    }
  }

  return KintoFX;
}

// This fixes compatibility with CommonJS required by browserify.
// See http://stackoverflow.com/questions/33505992/babel-6-changes-how-it-exports-default/33683495#33683495
if (typeof module === "object") {
  module.exports = loadKinto;
}

},{"../src/KintoBase":10,"../src/adapters/base":11,"./FirefoxStorage":1}],3:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":7}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":6,"_process":5,"inherits":4}],8:[function(require,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":8}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _api = require("./api");

var _api2 = _interopRequireDefault(_api);

var _collection = require("./collection");

var _collection2 = _interopRequireDefault(_collection);

var _base = require("./adapters/base");

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_BUCKET_NAME = "default";
const DEFAULT_REMOTE = "http://localhost:8888/v1";

/**
 * KintoBase class.
 */
class KintoBase {
  /**
   * Provides a public access to the base adapter class. Users can create a
   * custom DB adapter by extending {@link BaseAdapter}.
   *
   * @type {Object}
   */
  static get adapters() {
    return {
      BaseAdapter: _base2.default
    };
  }

  /**
   * Synchronization strategies. Available strategies are:
   *
   * - `MANUAL`: Conflicts will be reported in a dedicated array.
   * - `SERVER_WINS`: Conflicts are resolved using remote data.
   * - `CLIENT_WINS`: Conflicts are resolved using local data.
   *
   * @type {Object}
   */
  static get syncStrategy() {
    return _collection2.default.strategy;
  }

  /**
   * Constructor.
   *
   * Options:
   * - `{String}`       `remote`      The server URL to use.
   * - `{String}`       `bucket`      The collection bucket name.
   * - `{EventEmitter}` `events`      Events handler.
   * - `{BaseAdapter}`  `adapter`     The base DB adapter class.
   * - `{String}`       `dbPrefix`    The DB name prefix.
   * - `{Object}`       `headers`     The HTTP headers to use.
   * - `{String}`       `requestMode` The HTTP CORS mode to use.
   *
   * @param  {Object} options The options object.
   */
  constructor(options = {}) {
    const defaults = {
      bucket: DEFAULT_BUCKET_NAME,
      remote: DEFAULT_REMOTE
    };
    this._options = Object.assign(defaults, options);
    if (!this._options.adapter) {
      throw new Error("No adapter provided");
    }

    const { remote, events, headers, requestMode } = this._options;
    this._api = new _api2.default(remote, events, { headers, requestMode });

    // public properties
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    this.events = this._options.events;
  }

  /**
   * Creates a {@link Collection} instance. The second (optional) parameter
   * will set collection-level options like e.g. `remoteTransformers`.
   *
   * @param  {String} collName The collection name.
   * @param  {Object} options  May contain the following fields:
   *                           remoteTransformers: Array<RemoteTransformer>
   * @return {Collection}
   */
  collection(collName, options = {}) {
    if (!collName) {
      throw new Error("missing collection name");
    }

    const bucket = this._options.bucket;
    return new _collection2.default(bucket, collName, this._api, {
      events: this._options.events,
      adapter: this._options.adapter,
      dbPrefix: this._options.dbPrefix,
      idSchema: options.idSchema,
      remoteTransformers: options.remoteTransformers
    });
  }
}
exports.default = KintoBase;

},{"./adapters/base":11,"./api":12,"./collection":13}],11:[function(require,module,exports){
"use strict";

/**
 * Base db adapter.
 *
 * @abstract
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
class BaseAdapter {
  /**
   * Opens a connection to the database.
   *
   * @abstract
   * @return {Promise}
   */
  open() {
    return Promise.resolve();
  }

  /**
   * Closes current connection to the database.
   *
   * @abstract
   * @return {Promise}
   */
  close() {
    return Promise.resolve();
  }

  /**
   * Deletes every records present in the database.
   *
   * @abstract
   * @return {Promise}
   */
  clear() {
    throw new Error("Not Implemented.");
  }

  /**
   * Executes a batch of operations within a single transaction.
   *
   * @abstract
   * @param  {Function} callback The operation callback.
   * @param  {Object}   options  The options object.
   * @return {Promise}
   */
  execute(callback, options = { preload: [] }) {
    throw new Error("Not Implemented.");
  }

  /**
   * Retrieve a record by its primary key from the database.
   *
   * @abstract
   * @param  {String} id The record id.
   * @return {Promise}
   */
  get(id) {
    throw new Error("Not Implemented.");
  }

  /**
   * Lists all records from the database.
   *
   * @abstract
   * @return {Promise}
   */
  list() {
    throw new Error("Not Implemented.");
  }

  /**
   * Store the lastModified value.
   *
   * @abstract
   * @param  {Number}  lastModified
   * @return {Promise}
   */
  saveLastModified(lastModified) {
    throw new Error("Not Implemented.");
  }

  /**
   * Retrieve saved lastModified value.
   *
   * @abstract
   * @return {Promise}
   */
  getLastModified() {
    throw new Error("Not Implemented.");
  }

  /**
   * Load a dump of records exported from a server.
   *
   * @abstract
   * @return {Promise}
   */
  loadDump(records) {
    throw new Error("Not Implemented.");
  }
}
exports.default = BaseAdapter;

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SUPPORTED_PROTOCOL_VERSION = undefined;
exports.cleanRecord = cleanRecord;

var _utils = require("./utils.js");

var _http = require("./http.js");

var _http2 = _interopRequireDefault(_http);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const RECORD_FIELDS_TO_CLEAN = ["_status", "last_modified"];
/**
 * Currently supported protocol version.
 * @type {String}
 */
const SUPPORTED_PROTOCOL_VERSION = exports.SUPPORTED_PROTOCOL_VERSION = "v1";

/**
 * Cleans a record object, excluding passed keys.
 *
 * @param  {Object} record        The record object.
 * @param  {Array}  excludeFields The list of keys to exclude.
 * @return {Object}               A clean copy of source record object.
 */
function cleanRecord(record, excludeFields = RECORD_FIELDS_TO_CLEAN) {
  return Object.keys(record).reduce((acc, key) => {
    if (excludeFields.indexOf(key) === -1) {
      acc[key] = record[key];
    }
    return acc;
  }, {});
}

/**
 * High level HTTP client for the Kinto API.
 */
class Api {
  /**
   * Constructor.
   *
   * Options:
   * - {Object} headers      The key-value headers to pass to each request.
   * - {String} requestMode  The HTTP request mode.
   *
   * @param  {String}       remote  The remote URL.
   * @param  {EventEmitter} events  The events handler
   * @param  {Object}       options The options object.
   */
  constructor(remote, events, options = {}) {
    if (typeof remote !== "string" || !remote.length) {
      throw new Error("Invalid remote URL: " + remote);
    }
    if (remote[remote.length - 1] === "/") {
      remote = remote.slice(0, -1);
    }
    this._backoffReleaseTime = null;
    this.remote = remote;

    // public properties
    /**
     * The optional generic headers.
     * @type {Object}
     */
    this.optionHeaders = options.headers || {};
    /**
     * Current server settings, retrieved from the server.
     * @type {Object}
     */
    this.serverSettings = null;
    /**
     * The even emitter instance.
     * @type {EventEmitter}
     */
    if (!events) {
      throw new Error("No events handler provided");
    }
    this.events = events;

    /**
     * The HTTP instance.
     * @type {HTTP}
     */
    this.http = new _http2.default(this.events, { requestMode: options.requestMode });
    this._registerHTTPEvents();
  }

  /**
   * The remote endpoint base URL. Setting the value will also extract and
   * validate the version.
   * @type {String}
   */
  get remote() {
    return this._remote;
  }

  set remote(url) {
    let version;
    try {
      version = url.match(/\/(v\d+)\/?$/)[1];
    } catch (err) {
      throw new Error("The remote URL must contain the version: " + url);
    }
    if (version !== SUPPORTED_PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${ version }`);
    }
    this._remote = url;
    this._version = version;
  }

  /**
   * The current server protocol version, eg. `v1`.
   * @type {String}
   */
  get version() {
    return this._version;
  }

  /**
   * Backoff remaining time, in milliseconds. Defaults to zero if no backoff is
   * ongoing.
   *
   * @return {Number}
   */
  get backoff() {
    const currentTime = new Date().getTime();
    if (this._backoffReleaseTime && currentTime < this._backoffReleaseTime) {
      return this._backoffReleaseTime - currentTime;
    }
    return 0;
  }

  /**
   * Registers HTTP events.
   */
  _registerHTTPEvents() {
    this.events.on("backoff", backoffMs => {
      this._backoffReleaseTime = backoffMs;
    });
  }

  /**
   * Retrieves available server enpoints.
   *
   * Options:
   * - {Boolean} fullUrl: Retrieve a fully qualified URL (default: true).
   *
   * @param  {Object} options Options object.
   * @return {String}
   */
  endpoints(options = { fullUrl: true }) {
    const root = options.fullUrl ? this.remote : `/${ this.version }`;
    const urls = {
      root: () => `${ root }/`,
      batch: () => `${ root }/batch`,
      bucket: bucket => `${ root }/buckets/${ bucket }`,
      collection: (bucket, coll) => `${ urls.bucket(bucket) }/collections/${ coll }`,
      records: (bucket, coll) => `${ urls.collection(bucket, coll) }/records`,
      record: (bucket, coll, id) => `${ urls.records(bucket, coll) }/${ id }`
    };
    return urls;
  }

  /**
   * Retrieves Kinto server settings.
   *
   * @return {Promise}
   */
  fetchServerSettings() {
    if (this.serverSettings) {
      return Promise.resolve(this.serverSettings);
    }
    return this.http.request(this.endpoints().root()).then(res => {
      this.serverSettings = res.json.settings;
      return this.serverSettings;
    });
  }

  /**
   * Fetches latest changes from the remote server.
   *
   * @param  {String} bucketName  The bucket name.
   * @param  {String} collName    The collection name.
   * @param  {Object} options     The options object.
   * @return {Promise}
   */
  fetchChangesSince(bucketName, collName, options = { lastModified: null, headers: {} }) {
    const recordsUrl = this.endpoints().records(bucketName, collName);
    let queryString = "";
    const headers = Object.assign({}, this.optionHeaders, options.headers);

    if (options.lastModified) {
      queryString = "?_since=" + options.lastModified;
      headers["If-None-Match"] = (0, _utils.quote)(options.lastModified);
    }

    return this.fetchServerSettings().then(_ => this.http.request(recordsUrl + queryString, { headers })).then(res => {
      // If HTTP 304, nothing has changed
      if (res.status === 304) {
        return {
          lastModified: options.lastModified,
          changes: []
        };
      }
      // XXX: ETag are supposed to be opaque and stored ??as-is??.
      // Extract response data
      let etag = res.headers.get("ETag"); // e.g. '"42"'
      etag = etag ? parseInt((0, _utils.unquote)(etag), 10) : options.lastModified;
      const records = res.json.data;

      // Check if server was flushed
      const localSynced = options.lastModified;
      const serverChanged = etag > options.lastModified;
      const emptyCollection = records ? records.length === 0 : true;
      if (localSynced && serverChanged && emptyCollection) {
        throw Error("Server has been flushed.");
      }

      return { lastModified: etag, changes: records };
    });
  }

  /**
   * Builds an individual record batch request body.
   *
   * @param  {Object}  record The record object.
   * @param  {String}  path   The record endpoint URL.
   * @param  {Boolean} safe   Safe update?
   * @return {Object}         The request body object.
   */
  _buildRecordBatchRequest(record, path, safe) {
    const isDeletion = record._status === "deleted";
    const method = isDeletion ? "DELETE" : "PUT";
    const body = isDeletion ? undefined : { data: cleanRecord(record) };
    const headers = {};
    if (safe) {
      if (record.last_modified) {
        // Safe replace.
        headers["If-Match"] = (0, _utils.quote)(record.last_modified);
      } else if (!isDeletion) {
        // Safe creation.
        headers["If-None-Match"] = "*";
      }
    }
    return { method, headers, path, body };
  }

  /**
   * Process a batch request response.
   *
   * @param  {Object}  results          The results object.
   * @param  {Array}   records          The initial records list.
   * @param  {Object}  response         The response HTTP object.
   * @return {Promise}
   */
  _processBatchResponses(results, records, response) {
    // Handle individual batch subrequests responses
    response.json.responses.forEach((response, index) => {
      // TODO: handle 409 when unicity rule is violated (ex. POST with
      // existing id, unique field, etc.)
      if (response.status && response.status >= 200 && response.status < 400) {
        results.published.push(response.body.data);
      } else if (response.status === 404) {
        results.skipped.push(records[index]);
      } else if (response.status === 412) {
        results.conflicts.push({
          type: "outgoing",
          local: records[index],
          remote: response.body.details && response.body.details.existing || null
        });
      } else {
        results.errors.push({
          path: response.path,
          sent: records[index],
          error: response.body
        });
      }
    });
    return results;
  }

  /**
   * Sends batch update requests to the remote server.
   *
   * Options:
   * - {Object}  headers  Headers to attach to main and all subrequests.
   * - {Boolean} safe     Safe update (default: `true`)
   *
   * @param  {String} bucketName  The bucket name.
   * @param  {String} collName    The collection name.
   * @param  {Array}  records     The list of record updates to send.
   * @param  {Object} options     The options object.
   * @return {Promise}
   */
  batch(bucketName, collName, records, options = { headers: {} }) {
    const safe = options.safe || true;
    const headers = Object.assign({}, this.optionHeaders, options.headers);
    const results = {
      errors: [],
      published: [],
      conflicts: [],
      skipped: []
    };
    if (!records.length) {
      return Promise.resolve(results);
    }
    return this.fetchServerSettings().then(serverSettings => {
      // Kinto 1.6.1 possibly exposes multiple setting prefixes
      const maxRequests = serverSettings["batch_max_requests"] || serverSettings["cliquet.batch_max_requests"];
      if (maxRequests && records.length > maxRequests) {
        return Promise.all((0, _utils.partition)(records, maxRequests).map(chunk => {
          return this.batch(bucketName, collName, chunk, options);
        })).then(batchResults => {
          // Assemble responses of chunked batch results into one single
          // result object
          return batchResults.reduce((acc, batchResult) => {
            Object.keys(batchResult).forEach(key => {
              acc[key] = results[key].concat(batchResult[key]);
            });
            return acc;
          }, results);
        });
      }
      return this.http.request(this.endpoints().batch(), {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          defaults: { headers },
          requests: records.map(record => {
            const path = this.endpoints({ full: false }).record(bucketName, collName, record.id);
            return this._buildRecordBatchRequest(record, path, safe);
          })
        })
      }).then(res => this._processBatchResponses(results, records, res));
    });
  }
}
exports.default = Api;

},{"./http.js":15,"./utils.js":16}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SyncResultObject = undefined;

var _base = require("./adapters/base");

var _base2 = _interopRequireDefault(_base);

var _utils = require("./utils");

var _api = require("./api");

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Synchronization result object.
 */
class SyncResultObject {
  /**
   * Object default values.
   * @type {Object}
   */
  static get defaults() {
    return {
      ok: true,
      lastModified: null,
      errors: [],
      created: [],
      updated: [],
      deleted: [],
      published: [],
      conflicts: [],
      skipped: [],
      resolved: []
    };
  }

  /**
   * Public constructor.
   */
  constructor() {
    /**
     * Current synchronization result status; becomes `false` when conflicts or
     * errors are registered.
     * @type {Boolean}
     */
    this.ok = true;
    Object.assign(this, SyncResultObject.defaults);
  }

  /**
   * Adds entries for a given result type.
   *
   * @param {String} type    The result type.
   * @param {Array}  entries The result entries.
   * @return {SyncResultObject}
   */
  add(type, entries) {
    if (!Array.isArray(this[type])) {
      return;
    }
    this[type] = this[type].concat(entries);
    this.ok = this.errors.length + this.conflicts.length === 0;
    return this;
  }

  /**
   * Reinitializes result entries for a given result type.
   *
   * @param  {String} type The result type.
   * @return {SyncResultObject}
   */
  reset(type) {
    this[type] = SyncResultObject.defaults[type];
    this.ok = this.errors.length + this.conflicts.length === 0;
    return this;
  }
}

exports.SyncResultObject = SyncResultObject;
function createUUIDSchema() {
  return {
    generate() {
      return (0, _uuid.v4)();
    },

    validate(id) {
      return (0, _utils.isUUID)(id);
    }
  };
}

function markStatus(record, status) {
  return Object.assign({}, record, { _status: status });
}

function markDeleted(record) {
  return markStatus(record, "deleted");
}

function markSynced(record) {
  return markStatus(record, "synced");
}

/**
 * Import a remote change into the local database.
 *
 * @param  {IDBTransactionProxy} transaction The transaction handler.
 * @param  {Object}              remote      The remote change object to import.
 * @return {Object}
 */
function importChange(transaction, remote) {
  const local = transaction.get(remote.id);
  if (!local) {
    // Not found locally but remote change is marked as deleted; skip to
    // avoid recreation.
    if (remote.deleted) {
      return { type: "skipped", data: remote };
    }
    const synced = markSynced(remote);
    transaction.create(synced);
    return { type: "created", data: synced };
  }
  const identical = (0, _utils.deepEquals)((0, _api.cleanRecord)(local), (0, _api.cleanRecord)(remote));
  if (local._status !== "synced") {
    // Locally deleted, unsynced: scheduled for remote deletion.
    if (local._status === "deleted") {
      return { type: "skipped", data: local };
    }
    if (identical) {
      // If records are identical, import anyway, so we bump the
      // local last_modified value from the server and set record
      // status to "synced".
      const synced = markSynced(remote);
      transaction.update(synced);
      return { type: "updated", data: synced };
    }
    return {
      type: "conflicts",
      data: { type: "incoming", local: local, remote: remote }
    };
  }
  if (remote.deleted) {
    transaction.delete(remote.id);
    return { type: "deleted", data: { id: local.id } };
  }
  const synced = markSynced(remote);
  transaction.update(synced);
  // if identical, simply exclude it from all lists
  const type = identical ? "void" : "updated";
  return { type, data: synced };
}

/**
 * Abstracts a collection of records stored in the local database, providing
 * CRUD operations and synchronization helpers.
 */
class Collection {
  /**
   * Constructor.
   *
   * Options:
   * - `{BaseAdapter} adapter` The DB adapter (default: `IDB`)
   * - `{String} dbPrefix`     The DB name prefix (default: `""`)
   *
   * @param  {String} bucket  The bucket identifier.
   * @param  {String} name    The collection name.
   * @param  {Api}    api     The Api instance.
   * @param  {Object} options The options object.
   */
  constructor(bucket, name, api, options = {}) {
    this._bucket = bucket;
    this._name = name;
    this._lastModified = null;

    const DBAdapter = options.adapter;
    if (!DBAdapter) {
      throw new Error("No adapter provided");
    }
    const dbPrefix = options.dbPrefix || "";
    const db = new DBAdapter(`${ dbPrefix }${ bucket }/${ name }`);
    if (!(db instanceof _base2.default)) {
      throw new Error("Unsupported adapter.");
    }
    // public properties
    /**
     * The db adapter instance
     * @type {BaseAdapter}
     */
    this.db = db;
    /**
     * The Api instance.
     * @type {Api}
     */
    this.api = api;
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    this.events = options.events;
    /**
     * The IdSchema instance.
     * @type {Object}
     */
    this.idSchema = this._validateIdSchema(options.idSchema);
    /**
     * The list of remote transformers.
     * @type {Array}
     */
    this.remoteTransformers = this._validateRemoteTransformers(options.remoteTransformers);
  }

  /**
   * The collection name.
   * @type {String}
   */
  get name() {
    return this._name;
  }

  /**
   * The bucket name.
   * @type {String}
   */
  get bucket() {
    return this._bucket;
  }

  /**
   * The last modified timestamp.
   * @type {Number}
   */
  get lastModified() {
    return this._lastModified;
  }

  /**
   * Synchronization strategies. Available strategies are:
   *
   * - `MANUAL`: Conflicts will be reported in a dedicated array.
   * - `SERVER_WINS`: Conflicts are resolved using remote data.
   * - `CLIENT_WINS`: Conflicts are resolved using local data.
   *
   * @type {Object}
   */
  static get strategy() {
    return {
      CLIENT_WINS: "client_wins",
      SERVER_WINS: "server_wins",
      MANUAL: "manual"
    };
  }

  /**
   * Validates an idSchema.
   *
   * @param  {Object|undefined} idSchema
   * @return {Object}
   */
  _validateIdSchema(idSchema) {
    if (typeof idSchema === "undefined") {
      return createUUIDSchema();
    }
    if (typeof idSchema !== "object") {
      throw new Error("idSchema must be an object.");
    } else if (typeof idSchema.generate !== "function") {
      throw new Error("idSchema must provide a generate function.");
    } else if (typeof idSchema.validate !== "function") {
      throw new Error("idSchema must provide a validate function.");
    }
    return idSchema;
  }

  /**
   * Validates a list of remote transformers.
   *
   * @param  {Array|undefined} remoteTransformers
   * @return {Array}
   */
  _validateRemoteTransformers(remoteTransformers) {
    if (typeof remoteTransformers === "undefined") {
      return [];
    }
    if (!Array.isArray(remoteTransformers)) {
      throw new Error("remoteTransformers should be an array.");
    }
    return remoteTransformers.map(transformer => {
      if (typeof transformer !== "object") {
        throw new Error("A transformer must be an object.");
      } else if (typeof transformer.encode !== "function") {
        throw new Error("A transformer must provide an encode function.");
      } else if (typeof transformer.decode !== "function") {
        throw new Error("A transformer must provide a decode function.");
      }
      return transformer;
    });
  }

  /**
   * Deletes every records in the current collection and marks the collection as
   * never synced.
   *
   * @return {Promise}
   */
  clear() {
    return this.db.clear().then(_ => this.db.saveLastModified(null)).then(_ => ({ data: [], permissions: {} }));
  }

  /**
   * Encodes a record.
   *
   * @param  {String} type   Either "remote" or "local".
   * @param  {Object} record The record object to encode.
   * @return {Promise}
   */
  _encodeRecord(type, record) {
    if (!this[`${ type }Transformers`].length) {
      return Promise.resolve(record);
    }
    return (0, _utils.waterfall)(this[`${ type }Transformers`].map(transformer => {
      return record => transformer.encode(record);
    }), record);
  }

  /**
   * Decodes a record.
   *
   * @param  {String} type   Either "remote" or "local".
   * @param  {Object} record The record object to decode.
   * @return {Promise}
   */
  _decodeRecord(type, record) {
    if (!this[`${ type }Transformers`].length) {
      return Promise.resolve(record);
    }
    return (0, _utils.waterfall)(this[`${ type }Transformers`].reverse().map(transformer => {
      return record => transformer.decode(record);
    }), record);
  }

  /**
   * Adds a record to the local database.
   *
   * Note: If either the `useRecordId` or `synced` options are true, then the
   * record object must contain the id field to be validated. If none of these
   * options are true, an id is generated using the current IdSchema; in this
   * case, the record passed must not have an id.
   *
   * Options:
   * - {Boolean} synced       Sets record status to "synced" (default: `false`).
   * - {Boolean} useRecordId  Forces the `id` field from the record to be used,
   *                          instead of one that is generated automatically
   *                          (default: `false`).
   *
   * @param  {Object} record
   * @param  {Object} options
   * @return {Promise}
   */
  create(record, options = { useRecordId: false, synced: false }) {
    const reject = msg => Promise.reject(new Error(msg));
    if (typeof record !== "object") {
      return reject("Record is not an object.");
    }
    if ((options.synced || options.useRecordId) && !record.id) {
      return reject("Missing required Id; synced and useRecordId options require one");
    }
    if (!options.synced && !options.useRecordId && record.id) {
      return reject("Extraneous Id; can't create a record having one set.");
    }
    const newRecord = Object.assign({}, record, {
      id: options.synced || options.useRecordId ? record.id : this.idSchema.generate(),
      _status: options.synced ? "synced" : "created"
    });
    if (!this.idSchema.validate(newRecord.id)) {
      return reject(`Invalid Id: ${ newRecord.id }`);
    }
    return this.db.execute(transaction => {
      transaction.create(newRecord);
      return { data: newRecord, permissions: {} };
    }).catch(err => {
      if (options.useRecordId) {
        throw new Error("Couldn't create record. It may have been virtually deleted.");
      }
      throw err;
    });
  }

  /**
   * Updates a record from the local database.
   *
   * Options:
   * - {Boolean} synced: Sets record status to "synced" (default: false)
   * - {Boolean} patch:  Extends the existing record instead of overwriting it
   *   (default: false)
   *
   * @param  {Object} record
   * @param  {Object} options
   * @return {Promise}
   */
  update(record, options = { synced: false, patch: false }) {
    if (typeof record !== "object") {
      return Promise.reject(new Error("Record is not an object."));
    }
    if (!record.id) {
      return Promise.reject(new Error("Cannot update a record missing id."));
    }
    if (!this.idSchema.validate(record.id)) {
      return Promise.reject(new Error(`Invalid Id: ${ record.id }`));
    }
    return this.get(record.id).then(res => {
      const existing = res.data;
      let newStatus = "updated";
      if (record._status === "deleted") {
        newStatus = "deleted";
      } else if (options.synced) {
        newStatus = "synced";
      }
      return this.db.execute(transaction => {
        const source = options.patch ? Object.assign({}, existing, record) : record;
        const updated = markStatus(source, newStatus);
        if (existing.last_modified && !updated.last_modified) {
          updated.last_modified = existing.last_modified;
        }
        transaction.update(updated);
        return { data: updated, permissions: {} };
      });
    });
  }

  /**
   * Retrieve a record by its id from the local database.
   *
   * @param  {String} id
   * @param  {Object} options
   * @return {Promise}
   */
  get(id, options = { includeDeleted: false }) {
    if (!this.idSchema.validate(id)) {
      return Promise.reject(Error(`Invalid Id: ${ id }`));
    }
    return this.db.get(id).then(record => {
      if (!record || !options.includeDeleted && record._status === "deleted") {
        throw new Error(`Record with id=${ id } not found.`);
      } else {
        return { data: record, permissions: {} };
      }
    });
  }

  /**
   * Deletes a record from the local database.
   *
   * Options:
   * - {Boolean} virtual: When set to `true`, doesn't actually delete the record,
   *   update its `_status` attribute to `deleted` instead (default: true)
   *
   * @param  {String} id       The record's Id.
   * @param  {Object} options  The options object.
   * @return {Promise}
   */
  delete(id, options = { virtual: true }) {
    if (!this.idSchema.validate(id)) {
      return Promise.reject(new Error(`Invalid Id: ${ id }`));
    }
    // Ensure the record actually exists.
    return this.get(id, { includeDeleted: true }).then(res => {
      const existing = res.data;
      return this.db.execute(transaction => {
        // Virtual updates status.
        if (options.virtual) {
          transaction.update(markDeleted(existing));
        } else {
          // Delete for real.
          transaction.delete(id);
        }
        return { data: { id: id }, permissions: {} };
      });
    });
  }

  /**
   * Lists records from the local database.
   *
   * Params:
   * - {Object} filters The filters to apply (default: `{}`).
   * - {String} order   The order to apply   (default: `-last_modified`).
   *
   * Options:
   * - {Boolean} includeDeleted: Include virtually deleted records.
   *
   * @param  {Object} params  The filters and order to apply to the results.
   * @param  {Object} options The options object.
   * @return {Promise}
   */
  list(params = {}, options = { includeDeleted: false }) {
    params = Object.assign({ order: "-last_modified", filters: {} }, params);
    return this.db.list().then(results => {
      let reduced = (0, _utils.reduceRecords)(params.filters, params.order, results);
      if (!options.includeDeleted) {
        reduced = reduced.filter(record => record._status !== "deleted");
      }
      return { data: reduced, permissions: {} };
    });
  }

  /**
   * Import changes into the local database.
   *
   * @param  {SyncResultObject} syncResultObject The sync result object.
   * @param  {Object}           changeObject     The change object.
   * @return {Promise}
   */
  importChanges(syncResultObject, changeObject) {
    return Promise.all(changeObject.changes.map(change => {
      if (change.deleted) {
        return Promise.resolve(change);
      }
      return this._decodeRecord("remote", change);
    })).then(decodedChanges => {
      // XXX: list() should filter only ids in changes.
      return this.list({ order: "" }, { includeDeleted: true }).then(res => {
        return { decodedChanges, existingRecords: res.data };
      });
    }).then(({ decodedChanges, existingRecords }) => {
      return this.db.execute(transaction => {
        return decodedChanges.map(remote => {
          // Store remote change into local database.
          return importChange(transaction, remote);
        });
      }, { preload: existingRecords });
    }).catch(err => {
      // XXX todo
      err.type = "incoming";
      // XXX one error of the whole transaction instead of one per atomic op
      return [{ type: "errors", data: err }];
    }).then(imports => {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = imports[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          const imported = _step.value;

          if (imported.type !== "void") {
            syncResultObject.add(imported.type, imported.data);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return syncResultObject;
    }).then(syncResultObject => {
      syncResultObject.lastModified = changeObject.lastModified;
      // Don't persist lastModified value if any conflict or error occured
      if (!syncResultObject.ok) {
        return syncResultObject;
      }
      // No conflict occured, persist collection's lastModified value
      return this.db.saveLastModified(syncResultObject.lastModified).then(lastModified => {
        this._lastModified = lastModified;
        return syncResultObject;
      });
    });
  }

  /**
   * Resets the local records as if they were never synced; existing records are
   * marked as newly created, deleted records are dropped.
   *
   * A next call to {@link Collection.sync} will thus republish the whole content of the
   * local collection to the server.
   *
   * @return {Promise} Resolves with the number of processed records.
   */
  resetSyncStatus() {
    let _count;
    // XXX filter by status
    return this.list({}, { includeDeleted: true }).then(result => {
      return this.db.execute(transaction => {
        _count = result.data.length;
        result.data.forEach(r => {
          // Garbage collect deleted records.
          if (r._status === "deleted") {
            transaction.delete(r.id);
          } else {
            // Records that were synced become ??created??.
            transaction.update(Object.assign({}, r, {
              last_modified: undefined,
              _status: "created"
            }));
          }
        });
      });
    }).then(() => this.db.saveLastModified(null)).then(() => _count);
  }

  /**
   * Returns an object containing two lists:
   *
   * - `toDelete`: unsynced deleted records we can safely delete;
   * - `toSync`: local updates to send to the server.
   *
   * @return {Object}
   */
  gatherLocalChanges() {
    let _toDelete;
    // XXX filter by status
    return this.list({}, { includeDeleted: true }).then(res => {
      return res.data.reduce((acc, record) => {
        if (record._status === "deleted" && !record.last_modified) {
          acc.toDelete.push(record);
        } else if (record._status !== "synced") {
          acc.toSync.push(record);
        }
        return acc;
        // rename toSync to toPush or toPublish
      }, { toDelete: [], toSync: [] });
    }).then(({ toDelete, toSync }) => {
      _toDelete = toDelete;
      return Promise.all(toSync.map(this._encodeRecord.bind(this, "remote")));
    }).then(toSync => ({ toDelete: _toDelete, toSync }));
  }

  /**
   * Fetch remote changes, import them to the local database, and handle
   * conflicts according to `options.strategy`. Then, updates the passed
   * {@link SyncResultObject} with import results.
   *
   * Options:
   * - {String} strategy: The selected sync strategy.
   *
   * @param  {SyncResultObject} syncResultObject
   * @param  {Object}           options
   * @return {Promise}
   */
  pullChanges(syncResultObject, options = {}) {
    if (!syncResultObject.ok) {
      return Promise.resolve(syncResultObject);
    }
    options = Object.assign({
      strategy: Collection.strategy.MANUAL,
      lastModified: this.lastModified,
      headers: {}
    }, options);
    // First fetch remote changes from the server
    return this.api.fetchChangesSince(this.bucket, this.name, {
      lastModified: options.lastModified,
      headers: options.headers
    })
    // Reflect these changes locally
    .then(changes => this.importChanges(syncResultObject, changes))
    // Handle conflicts, if any
    .then(result => this._handleConflicts(result, options.strategy));
  }

  /**
   * Publish local changes to the remote server and updates the passed
   * {@link SyncResultObject} with publication results.
   *
   * @param  {SyncResultObject} syncResultObject The sync result object.
   * @param  {Object}           options          The options object.
   * @return {Promise}
   */
  pushChanges(syncResultObject, options = {}) {
    if (!syncResultObject.ok) {
      return Promise.resolve(syncResultObject);
    }
    const safe = options.strategy === Collection.SERVER_WINS;
    options = Object.assign({ safe }, options);

    // Fetch local changes
    return this.gatherLocalChanges().then(({ toDelete, toSync }) => {
      return Promise.all([
      // Delete never synced records marked for deletion
      this.db.execute(transaction => {
        toDelete.forEach(record => {
          transaction.delete(record.id);
        });
      }),
      // Send batch update requests
      this.api.batch(this.bucket, this.name, toSync, options)]);
    })
    // Update published local records
    .then(([deleted, synced]) => {
      const { errors, conflicts, published, skipped } = synced;
      // Merge outgoing errors into sync result object
      syncResultObject.add("errors", errors.map(error => {
        error.type = "outgoing";
        return error;
      }));
      // Merge outgoing conflicts into sync result object
      syncResultObject.add("conflicts", conflicts);
      // Reflect publication results locally
      const missingRemotely = skipped.map(r => Object.assign({}, r, { deleted: true }));
      const toApplyLocally = published.concat(missingRemotely);
      // Deleted records are distributed accross local and missing records
      const toDeleteLocally = toApplyLocally.filter(r => r.deleted);
      const toUpdateLocally = toApplyLocally.filter(r => !r.deleted);
      // First, apply the decode transformers, if any
      return Promise.all(toUpdateLocally.map(record => {
        return this._decodeRecord("remote", record);
      }))
      // Process everything within a single transaction
      .then(results => {
        return this.db.execute(transaction => {
          const updated = results.map(record => {
            const synced = markSynced(record);
            transaction.update(synced);
            return { data: synced };
          });
          const deleted = toDeleteLocally.map(record => {
            transaction.delete(record.id);
            // Amend result data with the deleted attribute set
            return { data: { id: record.id, deleted: true } };
          });
          return updated.concat(deleted);
        });
      }).then(published => {
        syncResultObject.add("published", published.map(res => res.data));
        return syncResultObject;
      });
    })
    // Handle conflicts, if any
    .then(result => this._handleConflicts(result, options.strategy)).then(result => {
      const resolvedUnsynced = result.resolved.filter(record => record._status !== "synced");
      // No resolved conflict to reflect anywhere
      if (resolvedUnsynced.length === 0 || options.resolved) {
        return result;
      } else if (options.strategy === Collection.strategy.CLIENT_WINS && !options.resolved) {
        // We need to push local versions of the records to the server
        return this.pushChanges(result, Object.assign({}, options, { resolved: true }));
      } else if (options.strategy === Collection.strategy.SERVER_WINS) {
        // If records have been automatically resolved according to strategy and
        // are in non-synced status, mark them as synced.
        return this.db.execute(transaction => {
          resolvedUnsynced.forEach(record => {
            transaction.update(markSynced(record));
          });
          return result;
        });
      }
    });
  }

  /**
   * Resolves a conflict, updating local record according to proposed
   * resolution ??? keeping remote record `last_modified` value as a reference for
   * further batch sending.
   *
   * @param  {Object} conflict   The conflict object.
   * @param  {Object} resolution The proposed record.
   * @return {Promise}
   */
  resolve(conflict, resolution) {
    return this.update(Object.assign({}, resolution, {
      // Ensure local record has the latest authoritative timestamp
      last_modified: conflict.remote.last_modified
    }));
  }

  /**
   * Handles synchronization conflicts according to specified strategy.
   *
   * @param  {SyncResultObject} result    The sync result object.
   * @param  {String}           strategy  The {@link Collection.strategy}.
   * @return {Promise}
   */
  _handleConflicts(result, strategy = Collection.strategy.MANUAL) {
    if (strategy === Collection.strategy.MANUAL || result.conflicts.length === 0) {
      return Promise.resolve(result);
    }
    return Promise.all(result.conflicts.map(conflict => {
      const resolution = strategy === Collection.strategy.CLIENT_WINS ? conflict.local : conflict.remote;
      return this.resolve(conflict, resolution);
    })).then(imports => {
      return result.reset("conflicts").add("resolved", imports.map(res => res.data));
    });
  }

  /**
   * Synchronize remote and local data. The promise will resolve with a
   * {@link SyncResultObject}, though will reject:
   *
   * - if the server is currently backed off;
   * - if the server has been detected flushed.
   *
   * Options:
   * - {Object} headers: HTTP headers to attach to outgoing requests.
   * - {Collection.strategy} strategy: See {@link Collection.strategy}.
   * - {Boolean} ignoreBackoff: Force synchronization even if server is currently
   *   backed off.
   * - {String} remote The remote Kinto server endpoint to use (default: null).
   *
   * @param  {Object} options Options.
   * @return {Promise}
   * @throws {Error} If an invalid remote option is passed.
   */
  sync(options = {
    strategy: Collection.strategy.MANUAL,
    headers: {},
    ignoreBackoff: false,
    remote: null
  }) {
    const previousRemote = this.api.remote;
    if (options.remote) {
      // Note: setting the remote ensures it's valid, throws when invalid.
      this.api.remote = options.remote;
    }
    if (!options.ignoreBackoff && this.api.backoff > 0) {
      const seconds = Math.ceil(this.api.backoff / 1000);
      return Promise.reject(new Error(`Server is backed off; retry in ${ seconds }s or use the ignoreBackoff option.`));
    }
    const result = new SyncResultObject();
    const syncPromise = this.db.getLastModified().then(lastModified => this._lastModified = lastModified).then(_ => this.pullChanges(result, options)).then(result => this.pushChanges(result, options)).then(result => {
      // Avoid performing a last pull if nothing has been published.
      if (result.published.length === 0) {
        return result;
      }
      return this.pullChanges(result, options);
    });
    // Ensure API default remote is reverted if a custom one's been used
    return (0, _utils.pFinally)(syncPromise, () => this.api.remote = previousRemote);
  }

  /**
   * Load a list of records already synced with the remote server.
   *
   * The local records which are unsynced or whose timestamp is either missing
   * or superior to those being loaded will be ignored.
   *
   * @param  {Array} records The previously exported list of records to load.
   * @return {Promise} with the effectively imported records.
   */
  loadDump(records) {
    const reject = msg => Promise.reject(new Error(msg));
    if (!Array.isArray(records)) {
      return reject("Records is not an array.");
    }

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = records[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        const record = _step2.value;

        if (!record.id || !this.idSchema.validate(record.id)) {
          return reject("Record has invalid ID: " + JSON.stringify(record));
        }

        if (!record.last_modified) {
          return reject("Record has no last_modified value: " + JSON.stringify(record));
        }
      }

      // Fetch all existing records from local database,
      // and skip those who are newer or not marked as synced.

      // XXX filter by status / ids in records
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return this.list({}, { includeDeleted: true }).then(res => {
      return res.data.reduce((acc, record) => {
        acc[record.id] = record;
        return acc;
      }, {});
    }).then(existingById => {
      return records.filter(record => {
        const localRecord = existingById[record.id];
        const shouldKeep =
        // No local record with this id.
        localRecord === undefined ||
        // Or local record is synced
        localRecord._status === "synced" &&
        // And was synced from server
        localRecord.last_modified !== undefined &&
        // And is older than imported one.
        record.last_modified > localRecord.last_modified;
        return shouldKeep;
      });
    }).then(newRecords => newRecords.map(markSynced)).then(newRecords => this.db.loadDump(newRecords));
  }
}
exports.default = Collection;

},{"./adapters/base":11,"./api":12,"./utils":16,"uuid":9}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Kinto server error code descriptors.
 * @type {Object}
 */
exports.default = {
  104: "Missing Authorization Token",
  105: "Invalid Authorization Token",
  106: "Request body was not valid JSON",
  107: "Invalid request parameter",
  108: "Missing request parameter",
  109: "Invalid posted data",
  110: "Invalid Token / id",
  111: "Missing Token / id",
  112: "Content-Length header was not provided",
  113: "Request body too large",
  114: "Resource was modified meanwhile",
  115: "Method not allowed on this end point",
  116: "Requested version not available on this server",
  117: "Client has sent too many requests",
  121: "Resource access is forbidden for this user",
  122: "Another resource violates constraint",
  201: "Service Temporary unavailable due to high load",
  202: "Service deprecated",
  999: "Internal Server Error"
};

},{}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _errors = require("./errors.js");

var _errors2 = _interopRequireDefault(_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Enhanced HTTP client for the Kinto protocol.
 */
class HTTP {
  /**
   * Default HTTP request headers applied to each outgoing request.
   *
   * @type {Object}
   */
  static get DEFAULT_REQUEST_HEADERS() {
    return {
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
  }

  /**
   * Default options.
   *
   * @type {Object}
   */
  static get defaultOptions() {
    return { timeout: 5000, requestMode: "cors" };
  }

  /**
   * Constructor.
   *
   * Options:
   * - {Number} timeout      The request timeout in ms (default: `5000`).
   * - {String} requestMode  The HTTP request mode (default: `"cors"`).
   *
   * @param {EventEmitter} events  The event handler.
   * @param {Object}       options The options object.
   */
  constructor(events, options = {}) {
    // public properties
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    if (!events) {
      throw new Error("No events handler provided");
    }
    this.events = events;

    options = Object.assign({}, HTTP.defaultOptions, options);

    /**
     * The request mode.
     * @see  https://fetch.spec.whatwg.org/#requestmode
     * @type {String}
     */
    this.requestMode = options.requestMode;

    /**
     * The request timeout.
     * @type {Number}
     */
    this.timeout = options.timeout;
  }

  /**
   * Performs an HTTP request to the Kinto server.
   *
   * Options:
   * - `{Object} headers` The request headers object (default: {})
   *
   * Resolves with an objet containing the following HTTP response properties:
   * - `{Number}  status`  The HTTP status code.
   * - `{Object}  json`    The JSON response body.
   * - `{Headers} headers` The response headers object; see the ES6 fetch() spec.
   *
   * @param  {String} url     The URL.
   * @param  {Object} options The fetch() options object.
   * @return {Promise}
   */
  request(url, options = { headers: {} }) {
    let response, status, statusText, headers, _timeoutId, hasTimedout;
    // Ensure default request headers are always set
    options.headers = Object.assign({}, HTTP.DEFAULT_REQUEST_HEADERS, options.headers);
    options.mode = this.requestMode;
    return new Promise((resolve, reject) => {
      _timeoutId = setTimeout(() => {
        hasTimedout = true;
        reject(new Error("Request timeout."));
      }, this.timeout);
      fetch(url, options).then(res => {
        if (!hasTimedout) {
          clearTimeout(_timeoutId);
          resolve(res);
        }
      }).catch(err => {
        if (!hasTimedout) {
          clearTimeout(_timeoutId);
          reject(err);
        }
      });
    }).then(res => {
      response = res;
      headers = res.headers;
      status = res.status;
      statusText = res.statusText;
      this._checkForDeprecationHeader(headers);
      this._checkForBackoffHeader(status, headers);
      return res.text();
    })
    // Check if we have a body; if so parse it as JSON.
    .then(text => {
      if (text.length === 0) {
        return null;
      }
      // Note: we can't consume the response body twice.
      return JSON.parse(text);
    }).catch(err => {
      const error = new Error(`HTTP ${ status || 0 }; ${ err }`);
      error.response = response;
      error.stack = err.stack;
      throw error;
    }).then(json => {
      if (json && status >= 400) {
        let message = `HTTP ${ status }; `;
        if (json.errno && json.errno in _errors2.default) {
          message += _errors2.default[json.errno];
          if (json.message) {
            message += `: ${ json.message }`;
          }
        } else {
          message += statusText || "";
        }
        const error = new Error(message.trim());
        error.response = response;
        error.data = json;
        throw error;
      }
      return { status, json, headers };
    });
  }

  _checkForDeprecationHeader(headers) {
    const alertHeader = headers.get("Alert");
    if (!alertHeader) {
      return;
    }
    let alert;
    try {
      alert = JSON.parse(alertHeader);
    } catch (err) {
      console.warn("Unable to parse Alert header message", alertHeader);
      return;
    }
    console.warn(alert.message, alert.url);
    this.events.emit("deprecated", alert);
  }

  _checkForBackoffHeader(status, headers) {
    let backoffMs;
    const backoffSeconds = parseInt(headers.get("Backoff"), 10);
    if (backoffSeconds > 0) {
      backoffMs = new Date().getTime() + backoffSeconds * 1000;
    } else {
      backoffMs = 0;
    }
    this.events.emit("backoff", backoffMs);
  }
}
exports.default = HTTP;

},{"./errors.js":14}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepEquals = deepEquals;
exports.quote = quote;
exports.unquote = unquote;
exports.sortObjects = sortObjects;
exports.filterObjects = filterObjects;
exports.reduceRecords = reduceRecords;
exports.partition = partition;
exports.isUUID = isUUID;
exports.waterfall = waterfall;
exports.pFinally = pFinally;

var _assert = require("assert");

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deeply checks if two structures are equals.
 *
 * @param  {Any} a
 * @param  {Any} b
 * @return {Boolean}
 */
function deepEquals(a, b) {
  try {
    (0, _assert.deepEqual)(a, b);
  } catch (err) {
    return false;
  }
  return true;
}

/**
 * Returns the specified string with double quotes.
 *
 * @param  {String} str  A string to quote.
 * @return {String}
 */
function quote(str) {
  return `"${ str }"`;
}

/**
 * Trim double quotes from specified string.
 *
 * @param  {String} str  A string to unquote.
 * @return {String}
 */
function unquote(str) {
  return str.replace(/^"/, "").replace(/"$/, "");
}

/**
 * Checks if a value is undefined.
 * @param  {Any}  value
 * @return {Boolean}
 */
function _isUndefined(value) {
  return typeof value === "undefined";
}

/**
 * Sorts records in a list according to a given ordering.
 *
 * @param  {String} order The ordering, eg. `-last_modified`.
 * @param  {Array}  list  The collection to order.
 * @return {Array}
 */
function sortObjects(order, list) {
  const hasDash = order[0] === "-";
  const field = hasDash ? order.slice(1) : order;
  const direction = hasDash ? -1 : 1;
  return list.slice().sort((a, b) => {
    if (a[field] && _isUndefined(b[field])) {
      return direction;
    }
    if (b[field] && _isUndefined(a[field])) {
      return -direction;
    }
    if (_isUndefined(a[field]) && _isUndefined(b[field])) {
      return 0;
    }
    return a[field] > b[field] ? direction : -direction;
  });
}

/**
 * Filters records in a list matching all given filters.
 *
 * @param  {String} filters  The filters object.
 * @param  {Array}  list     The collection to order.
 * @return {Array}
 */
function filterObjects(filters, list) {
  return list.filter(entry => {
    return Object.keys(filters).every(filter => {
      return entry[filter] === filters[filter];
    });
  });
}

/**
 * Filter and sort list against provided filters and order.
 *
 * @param  {Object} filters  The filters to apply.
 * @param  {String} order    The order to apply.
 * @param  {Array}  list     The list to reduce.
 * @return {Array}
 */
function reduceRecords(filters, order, list) {
  const filtered = filters ? filterObjects(filters, list) : list;
  return order ? sortObjects(order, filtered) : filtered;
}

/**
 * Chunks an array into n pieces.
 *
 * @param  {Array}  array
 * @param  {Number} n
 * @return {Array}
 */
function partition(array, n) {
  if (n <= 0) {
    return array;
  }
  return array.reduce((acc, x, i) => {
    if (i === 0 || i % n === 0) {
      acc.push([x]);
    } else {
      acc[acc.length - 1].push(x);
    }
    return acc;
  }, []);
}

/**
 * Checks if a string is an UUID.
 *
 * @param  {String} uuid The uuid to validate.
 * @return {Boolean}
 */
function isUUID(uuid) {
  return RE_UUID.test(uuid);
}

/**
 * Resolves a list of functions sequentially, which can be sync or async; in
 * case of async, functions must return a promise.
 *
 * @param  {Array} fns  The list of functions.
 * @param  {Any}   init The initial value.
 * @return {Promise}
 */
function waterfall(fns, init) {
  if (!fns.length) {
    return Promise.resolve(init);
  }
  return fns.reduce((promise, nextFn) => {
    return promise.then(nextFn);
  }, Promise.resolve(init));
}

/**
 * Ensure a callback is always executed at the end of the passed promise flow.
 *
 * @link   https://github.com/domenic/promises-unwrapping/issues/18
 * @param  {Promise}  promise  The promise.
 * @param  {Function} fn       The callback.
 * @return {Promise}
 */
function pFinally(promise, fn) {
  return promise.then(value => Promise.resolve(fn()).then(() => value), reason => Promise.resolve(fn()).then(() => {
    throw reason;
  }));
}

},{"assert":3}]},{},[2])(2)
});