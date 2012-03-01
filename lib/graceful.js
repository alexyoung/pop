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
 * Offers functionality similar to `mkdir -p`, but is async.
 *
 * @param {String} Path name
 * @param {Number} File creation mode
 * @param {Function} Callback
 * @param {Integer} Path depth counter
 */
function mkdir_p(dir, mode, callback, position) {
  mode = mode || process.umask();
  position = position || 0;
  var parts = path.normalize(dir).split('/');

  if (position >= parts.length) {
    if (callback) {
      return callback();
    } else {
      return true;
    }
  }

  var directory = parts.slice(0, position + 1).join('/') || '/';
  fs.stat(directory, function(err) {    
    if (err === null) {
      mkdir_p(dir, mode, callback, position + 1);
    } else {
      fs.mkdir(directory, mode, function(err) {
        if (err && err.errno != 17) {
          if (callback) {
            return callback(err);
          } else {
            throw err;
          }
        } else {
          mkdir_p(dir, mode, callback, position + 1);
        }
      });
    }
  });
}

/**
 * Polymorphic approach to `fs.mkdir()`
 *
 * @param {String} Path name
 * @param {Number} File creation mode
 * @param {Function} Callback
 */
fs.mkdir_p = function(dir, mode, callback) {
  mkdir_p(dir, mode, callback || process.noop);
}

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
