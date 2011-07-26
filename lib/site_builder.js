/*!
 * Pop - Builds a site based on `FileMap` and the loaded config.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var textile = require('stextile')
  , fs = require('./graceful')
  , path = require('path')
  , jade = require('jade')
  , stylus = require('stylus')
  , yamlish = require('yamlish')
  , markdown = require('markdown-js')
  , Paginator = require('./paginator')
  , FileMap = require('./file_map.js').FileMap
  , EventEmitter = require('events').EventEmitter
  , filters = require('./filters')
  , helpers = require('./helpers')
  , userHelpers = {}
  , userFilters = {}
  , userPostFilters = {};

/**
 * Initialize `SiteBuilder` with a config object and `FileMap`.
 *
 * @param {Object} Config options
 * @param {FileMap} A `FileMap` object
 * @api public
 */
function SiteBuilder(config, fileMap) {
  this.config = config;
  this.root = config.root;

  var helperFile = path.join(this.root, '_lib', 'helpers.js');
  if (path.existsSync(helperFile)) {
    userHelpers = require(helperFile);
  }

  var filterFile = path.join(this.root, '_lib', 'filters.js');
  if (path.existsSync(filterFile)) {
    userFilters = require(filterFile);
  }

  var postFilterFile = path.join(this.root, '_lib', 'post-filters.js');
  if (path.existsSync(postFilterFile)) {
    userPostFilters = require(postFilterFile);
  }

  this.outputRoot = config.output;
  this.fileMap = fileMap;
  this.posts = [];
  this.helpers = helpers;
  this.events = new EventEmitter();
  this.includes = {};

  this.loadPlugins();
}

/**
 * Loads Pop plugins based on `config.require`.
 */
SiteBuilder.prototype.loadPlugins = function() {
  if (!this.config.require) return;
  var self = this;

  this.config.require.forEach(function(name) {
    try {
      var plugin = require(name);
      self.loadPlugin(name, plugin);
    } catch (e) {
      console.error('Unable to load plugin:', name, '-', e.message);
      throw(e);
    }
  });
};

/**
 * Applies helpers and "user helpers" to an object so it can be easily passed to Jade.
 *
 * @param {String} The name of the plugin
 * @param {Object} The plugin's module.  Properties loaded: `helpers`, `filters`, `postFilters`
 */
SiteBuilder.prototype.loadPlugin = function(name, plugin) {
  if (!plugin) return;

  for (key in plugin.helpers) {
    if (plugin.helpers.hasOwnProperty(key))
      userHelpers[key] = this.bind(plugin.helpers[key]);
  }

  for (key in plugin.filters) {
    if (plugin.filters.hasOwnProperty(key))
      userFilters[key] = this.bind(plugin.filters[key]);
  }

  for (key in plugin.postFilters) {
    if (plugin.postFilters.hasOwnProperty(key))
      userPostFilters[key] = this.bind(plugin.postFilters[key]);
  }
};

/**
 * Applies helpers and "user helpers" to an object so it can be easily passed to Jade.
 *
 * @param {Object} An object to merge with
 * @return {Object} The mutated object
 */
SiteBuilder.prototype.applyHelpers = function(obj) {
  var self = this
    , key;

  for (key in this.helpers) {
    obj[key] = this.bind(this.helpers[key]);
  }

  for (key in userHelpers) {
    obj[key] = this.bind(userHelpers[key]);
  }

  obj.include = function(template) {
    return self.includes[template];
  };

  // TODO: Only do this once
  if (obj.paginate && obj.paginator)
    obj.paginate = obj.paginate(obj.paginator);

  obj.site = self;

  return obj;
};

/**
 * Binds methods to this `SiteBuilder`.
 *
 * @param {Function} The function to bind
 * @return {Function} The bound function
 */
SiteBuilder.prototype.bind = function(fn) {
  var self = this;
  return function() {
    return fn.apply(self, arguments);
  };
};

/**
 * Builds the site.  This is asynchronous, so various counters
 * and events are used to track progress.
 *
 */
SiteBuilder.prototype.build = function() {
  var self = this;

  function build() {
    var posts = self.findPosts()
      , otherFiles = self.otherRenderedFiles()
      , staticFiles = self.staticFiles()
      , autoGen = self.autoGenerate()
      , postsLeft = posts.length
      , filesLeft;

    // FIXME: In future not all auto generated files will be related to posts
    if (posts.length === 0) autoGen = [];

    filesLeft = posts.length + otherFiles.length + staticFiles.length + autoGen.length;

    function checkFinished() {
      if (filesLeft === 0) {
        self.events.emit('ready');
      }
    }

    posts.forEach(function(file) {
      self.renderPost(file, function() {
        filesLeft--;
        postsLeft--;
        checkFinished();
        if (postsLeft === 0) {
          autoGen.forEach(function(file) {
            self.autoGenerateFile(file, function() {
              filesLeft--;
              checkFinished();
            });
          });
        }
      });
    });

    otherFiles.forEach(function(file) {
      self.renderFile(file, function() {
        filesLeft--;
        checkFinished();
      });
    });

    staticFiles.forEach(function(file) { 
      self.copyStatic(file, function() {
        filesLeft--;
        checkFinished();
      });
    });
  }

  this.events.once('cached includes', build);
  this.cacheIncludes();
};

/**
 * Returns any configured built-in pages,
 * or an empty array.
 *
 * @return {Array}
 */
SiteBuilder.prototype.autoGenerate = function() {
  if (!this.config.autoGenerate) return [];
  return this.config.autoGenerate;
};

/**
 * Generates a built-in page.  Only atom feeds
 * are currently available.
 *
 * @param {String} Page/file details from the config object
 * @param {Function} A callback function to run on completion
 */
SiteBuilder.prototype.autoGenerateFile = function(file, fn) {
  // TODO: Allow this to be easily extended
  var self = this;

  if (file.feed) {
    if (!this.config.url || !this.config.title) {
      console.error('ERROR: Built-in feed generation requires config values for: url and title.'); 
    } else {
      var layoutData = "!{atom('" + this.config.url + file.feed + "')}";
      var html = jade.render(layoutData, { locals: self.applyHelpers({ }) });
      this.write(this.outFileName(file.feed), html);
      fn();
    }
  }
};

/**
 * Determines if a file needs Jade or Stylus rendering.
 *
 * @param {Object} An instance that has a `type` property
 * @return {Boolean}
 */
SiteBuilder.prototype.isRenderedFile = function(file) {
  return file.type === 'file jade' || file.type === 'file styl';
};

/**
 * Builds a single file.
 * TODO: Work in progress.
 *
 * @param {String} File name to build
 */
SiteBuilder.prototype.buildChange = function(file) {
  if (this.fileMap.isExcludedFile(file)) return;

  file = {
    type: this.fileMap.fileType(file)
  , name: file
  };

  if (file.type.indexOf('post') !== -1) {
    this.renderPost(file);
  } else if (this.isRenderedFile(file)) {
    this.renderFile(file);
  } else if (file.type === 'file') {
    this.copyStatic(file);
  }
};

/**
 * Iterates over the files in the `FileMap` object to find posts.
 *
 * @return {Array} A list of posts
 */
SiteBuilder.prototype.findPosts = function() {
  return this.fileMap.files.filter(function(file) {
    return file.type.indexOf('post') !== -1;
  });
};

/**
 * Iterates over the files in the `FileMap` object to find "other" rendered files.
 *
 * @return {Array} A list of files
 */
SiteBuilder.prototype.otherRenderedFiles = function() {
  var self = this;
  return this.fileMap.files.filter(function(file) {
    return self.isRenderedFile(file);
  });
};

/**
 * Iterates over the files in the `FileMap` object to find static files that require copying.
 *
 * @return {Array} A list of files
 */
SiteBuilder.prototype.staticFiles = function() {
  return this.fileMap.files.filter(function(file) {
    return file.type === 'file';
  });
};

/**
 * Copies a static file.
 *
 * @param {String} The file name
 * @param {Function} A callback to run on completion
 */
SiteBuilder.prototype.copyStatic = function(file, fn) {
  var outDir = this.outFileName(path.dirname(file.name.replace(this.root, '')))
    , fileName = path.join(outDir, path.basename(file.name))
    , self = this;

  // TODO: Use a configurable ignore list
  if (path.basename(file.name).match(/^_/)) return fn.apply(self);

  fs.mkdir_p(outDir, 0777, function(err) {
    if (err) {
      console.error('Error creating directory:', outDir);
      throw(err);
    }

    fs.readFile(file.name, function(err, data) {
      if (err) {
        console.error('Error reading file:', file.name);
        throw(err);
      }

      fs.writeFile(fileName, data, function(err) {
        if (err) {
          console.error('Error writing file:', fileName);
          throw(err);
        }

        if (fn) fn.apply(self);
      });
    });
  });
};

/**
 * Parse YAML meta data for both files and posts.
 *
 * @param {String} File name (used by logging on errors)
 * @param {String} Data to parse
 * @return {Array} Parsed YAML
 */
SiteBuilder.prototype.parseMeta = function(file, data) {
  function clean(yaml) {
    for (var key in yaml) {
      if (typeof yaml[key] === 'string') {
        var m = yaml[key].match(/^"([^"]*)"$/);
        if (m) yaml[key] = m[1];
      }
    }
    return yaml;
  }

  // FIXME: This shouldn't be used, my articles are badly formatted
  function fix(text) {
    if (!text) return;
    return text.split('\n').map(function(line) {
      if (line.match(/^- /))
        line = '  ' + line;
      return line;
    }).join('\n');
  }

  var dataChunks = data.split('---')
    , parsedYAML = [];

  try {
    if (dataChunks[1]) {
      // TODO: Improve YAML extraction, add JSON alternative
      parsedYAML = clean(yamlish.decode(fix(dataChunks[1] || data)));
      return [parsedYAML, ((dataChunks || []).slice(2).join('---')).trim()];
    } else {
      return ['', data];
    }
  } catch (e) {
    console.error("Couldn't parse YAML in:", file, ':', e);
  }
};

/**
 * Writes a file, making directories recursively when required.
 *
 * @param {String} File name to write to
 * @param {String} Contents of the file
 */
SiteBuilder.prototype.write = function(fileName, content) {
  if (!content) return console.error('No content for:', fileName);

  // Apply the post-filters before writing
  content = this.applyPostFilters(content);

  fs.mkdir_p(path.dirname(fileName), 0777, function(err) {
    if (err) {
      console.error('Error creating directory:', path.dirname(fileName));
      throw(err);
    }

    fs.writeFile(fileName, content, function(err) {
      if (err) {
        console.error('Error writing file:', fileName);
        throw(err);
      }
    });
  });
};

/**
 * Returns a full path name.
 *
 * @param {String} Relative path name, i.e., `_posts/`
 * @param {String} File name
 * @return {String}
 */
SiteBuilder.prototype.outFileName = function(subDir, name) {
  return path.join(this.outputRoot, subDir, name);
};

/**
 * Caches templates inside `_includes/`
 */
SiteBuilder.prototype.cacheIncludes = function() {
  var self = this;

  function done() {
    self.events.emit('cached includes');
  }

  path.exists(path.join(this.root, '_includes'), function(exists) {
    if (!exists) {
      done();
    } else {
      fs.readdir(path.join(self.root, '_includes'), function(err, files) {
        if (!files) return;
        var file;

        if (files.length === 0) done();

        for (var i = 0; i < files.length; i++) {
          file = files[i];
          // TODO: Configurable templates
          if (path.extname(file) !== '.jade') {
            if (i === files.length) return self.events.emit('cached includes');
          } else {
            fs.readFile(path.join(self.root, '_includes', file), 'utf8', function(err, data) {
              // TODO: This won't cope with _include/file/file, but people will expect this
              var html = jade.render(data, { locals: self.applyHelpers({}) })
                , name = path.basename(file).replace(path.extname(file), '');
              self.includes[name] = html;

              if (i === files.length) done();
            });
          }
        }
      });
    }
  });
};

/**
 * Renders a post using a template.  Called by `renderPost`.
 * 
 * @param {String} Template file name
 * @param {Object} A post object
 * @param {String} The post's content
 */
SiteBuilder.prototype.renderTemplate = function(templateFile, post, content) {
  var self = this;
  templateFile = path.join(this.root, '_layouts', templateFile + '.jade');

  fs.readFile(templateFile, 'utf8', function(err, data) {
    if (err) {
      console.error('Error in: ' + templateFile);
      console.error(err);
      console.error(err.message);
      throw(err);
    }

    try {
      var html = jade.render(data, { locals: self.applyHelpers({ post: post, content: content }) })
        , fileName = self.outFileName(post.fileName, 'index.html')
        , dirName = path.dirname(fileName);
    } catch (e) {
      console.error('Error rendering:', templateFile);
      throw(e);
    }

    path.exists(dirName, function(exists) {
      if (exists) {
        self.write(fileName, html);
      } else {
        fs.mkdir_p(dirName, 0777, function(err) {
          if (err) {
            console.error('Error making directory:', dirName);
            throw(err);
          }
          self.write(fileName, html);
        });
      }
    });
  });
};

/**
 * Renders a generic Jade file and will supply pagination if required.
 * 
 * @param {String} File name
 * @param {Function} Callback to run on completion
 */
SiteBuilder.prototype.renderFile = function(file, fn) {
  var self = this;

  if (file.type === 'file styl') {
    var outFileName = self.outFileName(
      path.dirname(file.name.replace(self.root, '')),
      path.basename(file.name).replace(path.extname(file.name), '.css')
    );

    return fs.readFile(file.name, 'utf8', function(err, fileData) {
      stylus.render(fileData, { filename: path.basename(outFileName) }, function(err, css) {
        if (err) throw err;
        self.write(outFileName, css);
      });
    });
  }

  function render(fileData, meta, layoutData, dirName) {
    // Use .html for file extensions unless the file has the format file.ext.jade
    var ext = file.name.match('\\.[^.]*\\' + path.extname(file.name) + '$') ? '' : '.html';
    dirName = dirName || '';

    var outFileName = self.outFileName(
      path.dirname(file.name.replace(self.root, '')) + dirName,
      path.basename(file.name).replace(path.extname(file.name), ext)
    );

    var fileContent = jade.render(fileData, {
      locals: self.applyHelpers({ paginator: self.paginator, page: meta }),
    });

    if (!layoutData) {
      self.write(outFileName, fileContent);
    } else {
      var html = jade.render(layoutData, { locals: self.applyHelpers({ content: fileContent }) });
      self.write(outFileName, html);
    }

    if (fn) fn.apply(self);
  }

  fs.readFile(file.name, 'utf8', function(err, fileData) {
    var meta = self.parseMeta(file.name, fileData)
      , fileContent = '';

    fileData = meta[1];
    meta = meta[0];

    if (!meta.layout) {
      self.paginator = new Paginator(self.config.perPage, self.posts);
      render(fileData, meta);
    } else {
      fs.readFile(path.join(self.root, '_layouts', meta.layout + '.jade'), function(err, layoutData) {
        if (err) {
          console.error('Unable to read layout:', meta.layout + '.jade');
          throw(err);
        }

        // TODO: Per page config
        self.paginator = new Paginator(self.config.perPage, self.posts)
        render(fileData, meta, layoutData);

        if (meta.paginate) {
          while (self.paginator.items.length) {
            self.paginator.advancePage();
            render(fileData, meta, layoutData, '/page' + self.paginator.page + '/');
          }
        }
      });
    }
  });
};

/**
 * Parses a file name according to the permalink format.
 *
 * @param {String} A post file name
 * @return {Object} An object containing the parsed file name
 */
SiteBuilder.prototype.parseFileName = function(fileName) {
  var format = this.config.permalink
    , parts = fileName.match(/(\d+)-(\d+)-(\d+)-(.*)/)
    , year = parts[1]
    , month = parts[2]
    , day = parts[3]
    , title = parts[4].replace(/\.(textile|md)/, '');

  return { date:  new Date(year, month - 1, day),
           fileName: format.replace(':year', year).
                       replace(':month', month).
                       replace(':day', day).
                       replace(':title', title) };
};

/**
 * Applies internal and user-supplied content pre-filters.
 *
 * @param {String} Text to transform using filters
 * @return {String} The transformed text
 */
SiteBuilder.prototype.applyFilters = function(text) {
  for (var key in filters) {
    text = filters[key](text);
  }

  for (key in userFilters) {
    text = userFilters[key].apply(this, [text]);
  }

  return text;
};

/**
 * Applies user-supplied content post-filters.  These are run after HTML is generated.
 *
 * @param {String} Text to transform using filters
 * @return {String} The transformed text
 */
SiteBuilder.prototype.applyPostFilters = function(text) {
  for (key in userPostFilters) {
    text = userPostFilters[key].apply(this, [text]);
  }

  return text;
};

/**
 * Renders a post.
 *
 * @param {String} Post file name
 * @param {Function} A callback to run on completion
 */
SiteBuilder.prototype.renderPost = function(file, fn) {
  var self = this
    , formatter;

  if (file.type.indexOf('textile') !== -1) {
    formatter = textile;
  } else if (file.type.indexOf('md') !== -1) {
    formatter = markdown.makeHtml;
  }

  fs.readFile(file.name, 'utf8', function(err, data) {
    var meta = self.parseMeta(file.name, data);
    data = meta[1];
    meta = meta[0];

    // Categories and tags are synonyms
    if (!meta.tags) meta.tags = meta.categories ? meta.categories : [];

    if (data && meta) {
      var fileDetails = self.parseFileName(file.name);
      meta.fileName = fileDetails.fileName;
      meta.url = fileDetails.fileName;
      meta.date = fileDetails.date;
      meta.content = formatter(self.applyFilters(data));

      if (meta.summary)
        meta.summary = formatter(self.applyFilters(meta.summary));

      self.renderTemplate(meta.layout, meta, meta.content);
      self.posts.push(meta);
    }

    if (fn) fn.apply(self);
  });
};

/**
 * Adds a listener to the internal `EventEmitter` object.
 *
 * @param {String} The event name
 * @param {Function} The handler
 */
SiteBuilder.prototype.on = function(eventName, fn) {
  this.events.on(eventName, fn); 
};

module.exports = SiteBuilder;
