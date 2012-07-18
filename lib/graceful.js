/*!
 * Pop - Gracefully handles file descriptor exhaustion.
 * Based on code from npm and elsewhere.
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var fs = require('fs')
  , path = require('path')
  , defaultTimeout = 0
  , timeout = defaultTimeout;

/**
 * Polymorphic approach to `fs.mkdir()`
 *
 * @param {String} Path name
 * @param {Number} File creation mode
 * @param {Function} Callback
 */
fs.mkdir_p = require('mkdirp');

// Graceful patching wraps async fs methods
Object.keys(fs)
  .forEach(function(i) {
    exports[i] = (typeof fs[i] !== 'function') ? fs[i]
               : (i.match(/^[A-Z]|^create|Sync$/)) ? function() {
                   return fs[i].apply(fs, arguments);
                 }
               : graceful(fs[i]);
  });

function graceful(fn) { return function GRACEFUL() {
  var args = Array.prototype.slice.call(arguments)
    , cb_ = args.pop();
  
  args.push(cb);

  function cb(er) {
    if (er && er.message.match(/^EMFILE, Too many open files/)) {
      setTimeout(function() {
        GRACEFUL.apply(fs, args)
      }, timeout++);
      return;
    }
    timeout = defaultTimeout;
    cb_.apply(null, arguments);
  }
  fn.apply(fs, args)
}};
