/*!
 * Pop - CLI tools, for post and site generation.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var yamlish = require('yamlish')
  , path = require('path')
  , fs = require('fs')
  , log = require(__dirname + '/log')
  , generators = require(__dirname + '/generators');

module.exports = {
  /**
   * Adds zero padding to single digit numbers.
   *
   * @param {Integer} A number to pad
   * @return {String}
   */
  datePad: function(num) {
    return num.toString().length === 1 ? '0' + num : num;
  },

  /**
   * Makes a post file name (not URL) based on the config's permanlink format.
   *
   * @param {String} Permalink format
   * @param {Date} Date for the file name
   * @param {String} The title for the post
   * @param {String} The file format (md or textile)
   * @return {String}
   */
  getPostFileName: function(pf, date, title, format) {
    title = encodeURI(title.toLowerCase().replace(/\s+/g, '-'));
    return '_posts/' + pf.replace(':year', date.getFullYear())
             .replace(':month', this.datePad(date.getMonth() + 1))
             .replace(':day', this.datePad(date.getDate()))
             .replace(/^\//, '')
             .replace(/\//g, '-')
             .replace(':title', title + '.' + format);
  },

  /**
   * Generates a stubbed post and writes it based on a file name.
   *
   * @param {Config} A config object
   * @param {String} Site title
   * @param {Function} callback
   * @return {String}
   */
  makePost: function(config, title, fn) {
    // TODO: Get format and author from command-line options
    var meta = {
          layout: 'post'
        , title: title
        , author: process.env.LOGNAME || ''
        , tags: ['tag_1', 'tag_2']
        }
      , url = ''
      , format = 'md'
      , date = new Date()
      , frontMatter = ''
      , fileName = this.getPostFileName(config.permalink, date, title, format);

    frontMatter = '---\n' + yamlish.encode(meta).replace(/^\s+/mg, '') + '\n---\n';

    fs.writeFile(path.join(config.root, fileName), frontMatter, function(err) {
      if (err) {
        log.error('Error writing file:', fileName);
        throw(err);
      }
      log.info('Post created:', fileName);
      fn();
    });
  },

  /**
   * Default config settings, used by site generator.
   *
   * @return {String}
   */
  defaultConfig: function() {
    return '' 
    + '{  "url": "http://example.com"\n'
    + ' , "title": "Example"\n'
    + ' , "permalink": "/:year/:month/:day/:title"\n'
    + ' , "perPage": 10\n'
    + ' , "exclude": ["\\\\.swp"]\n'
    + ' , "autoGenerate": [{"feed": "feed.xml", "rss": "feed.rss"}] }\n'
  },

  /**
   * Default index file, used by site generator.
   *
   * @return {String}
   */
  defaultIndex: function() {
    return ''
    + '---\n'
    + 'layout: default\n'
    + 'title: My Site\n'
    + 'paginate: true\n'
    + '---\n\n'
    + '!{paginatedPosts()}\n'
    + '!{paginate}\n';
  },

  /**
   * Default layout, used by site generator.
   *
   * @return {String}
   */
  defaultLayout: function() {
    return fs.readFileSync(__dirname + '/assets/default.jade');
  },

  /**
   * Default post layout, used by site generator.
   *
   * @return {String}
   */
  defaultPostLayout: function() {
    return fs.readFileSync(__dirname + '/assets/post.jade');
  },

  /**
   * Sample post, to get people started.
   *
   * @return {String}
   */
  samplePost: function() {
    return ''
    + '---\n'
    + 'title: Example Post About Something\n'
    + 'author: Pop\n'
    + 'layout: post\n'
    + 'tags:\n'
    + '- tag1\n'
    + '- tag2\n'
    + '---\n'
    + 'Pop is a static site generator.  It can be used to make blogs.  I hope you enjoy it!\n';
  },

  /**
   * Built-in stylesheet.
   *
   * @return {String}
   */
  defaultStylus: function() {
    return fs.readFileSync(__dirname + '/assets/screen.styl');
  },

  /**
   * Site generator.  Will not create a site if `pathName` exists.
   *
   * @param {String} Site path name
   * @param {Function} Callback to run when finished
   */
  makeSite: function(args, fn) {
    var pathName
      , generator;

    if (args.length === 1) {
      pathName = args[0];
      generator = 'default';
    } else {
      pathName = args[1];
      generator = args[0];
    }

    if (generators.hasOwnProperty(generator)) {
      generators[generator].run(this, pathName, fn);
    } else {
      try {
        var pluginGenerator = require(generator);
      } catch (e) {
        log.error('Error: Unable to find the', generator, 'generator');
        return;
      }

      pluginGenerator.generator.run(this, pathName, fn);
    }
  },

  /**
    * Renders files that match `pattern`.
    *
    * @param {Object} Site config
    * @param {String} File name pattern
    * @param {Function} Callback
    */
  renderFile: function(pop, config, pattern) {
    var fileMap = new pop.FileMap(config)
      , siteBuilder = new pop.SiteBuilder(config);
    
    fileMap.on('ready', function() {
      if (fileMap.files.length === 0) {
        fn();
      } else {
        siteBuilder.fileMap = fileMap;
        siteBuilder.build();
        siteBuilder.on('ready', function() {
          log.info('%d files rendered.', fileMap.files.length);
        });
      }
    });

    fileMap.search(pattern);
  }
};
