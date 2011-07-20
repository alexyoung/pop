/*!
 * Pop - Recursive file analyser.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var fs = require(__dirname + '/graceful')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter;

/**
 * Initialize `FileMap` with a config object.
 *
 * @param {Object} options
 * @api public
 */
function FileMap(config) {
  this.config = config || {};
  this.config.exclude = config && config.exclude ? config.exclude : [];
  this.config.exclude.push('/_site');
  this.ignoreDotFiles = true;
  this.root = config.root;
  this.files = [];
  this.events = new EventEmitter();
  this.filesLeft = 0;
  this.dirsLeft = 1;
}

/**
 * Determines file type based on file extension.
 *
 * @param {String} File name
 * @return {String} Internal file type used by `SiteBuilder`
 */
FileMap.prototype.fileType = function(fileName) {
  var extension = path.extname(fileName).substring(1);

  if (fileName.match(/\/_posts\//)) {
    return 'post ' + extension;
  } else if (fileName.match(/\/_layouts\//)) {
    return 'layout ' + extension;
  } else if (fileName.match(/\/_includes\//)) {
    return 'include ' + extension;
  } else if (['jade', 'ejs', 'styl'].indexOf(extension) !== -1) {
    return 'file ' + extension;
  } else {
    return 'file';
  }
};

/**
 * Recursively iterates from an initial path.
 *
 * @param {String} Start path name
 */
FileMap.prototype.walk = function(dir) {
  if (!dir) dir = this.root;

  var self = this;

  fs.readdir(dir, function(err, files) {
    self.dirsLeft--;
    if (!files) return;
    files.forEach(function(file) {
      file = path.join(dir, file);
      self.filesLeft++;
      fs.stat(file, function(err, stats) {
        if (err) console.log('Error:', err);
        if (!stats) return;
        if (stats.isDirectory(file)) {
          self.filesLeft--;
          self.dirsLeft++;
          self.walk(file);
          self.addFile(file, 'dir');
        } else {
          self.filesLeft--;
          self.addFile(file, self.fileType(file));
          if (self.filesLeft === 0 && self.dirsLeft === 0) {
            process.nextTick(function() {
              self.events.emit('ready');
            });
          }
        }
      });
    });
  });
};

/**
 * Checks to see if a file name matches the excluded patterns.
 *
 * @param {String} File name
 * @return {Boolean} Should the file be excluded? 
 */
FileMap.prototype.isExcludedFile = function(file) {
  if (this.ignoreDotFiles)
    if (file.match(/\/\./)) return true;

  return this.config.exclude.some(function(pattern) {
    return file.match(pattern);
  });
};

/**
 * Determines file type based on file extension.
 *
 * @param {String} File name
 * @param {String} File type
 */
FileMap.prototype.addFile = function(file, type) {
  if (this.isExcludedFile(file)) return;

  this.files.push({
    name: file,
    type: type,
  });
};

/**
 * Bind an event to the internal `EventEmitter`.
 *
 * @param {String} Event name
 * @param {Function} Handler
 */
FileMap.prototype.on = function(eventName, fn) {
  this.events.on(eventName, fn);
};

module.exports = FileMap;
