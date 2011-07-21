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
  , fs = require('fs');

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
    // TODO: Remove non-ASCII?
    title = title.toLowerCase().replace(/\s+/g, '-');
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
    // TODO: Get at least format and author from CLI
    var meta = {
          layout: 'post'
        , title: title
        , author: ''
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
        console.log('Error writing file:', fileName);
        throw(err);
      }
      console.log('Post created:', fileName);
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
    + '{  "url": "http://example.com/"\n'
    + ' , "title": "Example"\n'
    + ' , "permalink": "/:year/:month/:day/:title"\n'
    + ' , "paginate": 10\n'
    + ' , "exclude": ["\\\\.swp"]\n'
    + ' , "autoGenerate": [{"feed": "feed.xml"}] }\n'
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
    return ''
    + '!!! 5\n'
    + 'html(lang="en")\n'
    + '  head\n'
    + '    title #{site.config.title}\n'
    + '    link(href="/stylesheets/screen.css", media="screen", rel="stylesheet", type="text/css")\n'
    + '  body\n'
    + '    header#header\n'
    + '      hgroup\n'
    + '        h1 #{site.config.title}\n'
    + '        h2 I promise to write regularly!\n'
    + '    !{content}\n'
    + '    footer\n'
    + '      nav\n'
    + '        h1 Related Sites\n'
    + '        ul\n'
    + '          li\n'
    + '            a(href="http://popjs.com") Powered by Pop\n'
    + '          li\n'
    + '            a(href="http://dailyjs.com") Learn JavaScript\n'
    + '          li\n'
    + '            a(href="http://alexyoung.org") Designed by Alex R. Young\n'
    + '      p.copyright Content &copy; The Authors\n';
  },

  /**
   * Default post layout, used by site generator.
   *
   * @return {String}
   */
  defaultPostLayout: function() {
    return ''
    + '!!! 5\n'
    + 'html(lang="en")\n'
    + '  head\n'
    + '    title #{post.title}\n'
    + '    link(href="/stylesheets/screen.css", media="screen", rel="stylesheet", type="text/css")\n'
    + '  body\n'
    + '    header#header\n'
    + '      hgroup\n'
    + '        h1 #{site.config.title}\n'
    + '        h2 I promise to write regularly!\n'
    + '    !{hNews(post)}\n'
    + '    footer\n'
    + '      nav\n'
    + '        h1 Related Sites\n'
    + '        ul\n'
    + '          li\n'
    + '            a(href="http://popjs.com") Powered by Pop\n'
    + '          li\n'
    + '            a(href="http://dailyjs.com") Learn JavaScript\n'
    + '          li\n'
    + '            a(href="http://alexyoung.org") Designed by Alex R. Young\n'
    + '      p.copyright Content &copy; The Authors\n';
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
   * Sample post, to get people started.
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
  makeSite: function(pathName, fn) {
    if (path.existsSync(pathName)) {
      console.log('Error: Path already exists');
      process.exit(1);
    } else {
      var paths = ['_posts', '_lib', '_layouts', '_includes', 'stylesheets']
        , postFileName = this.getPostFileName('/:year/:month/:day/:title', new Date(), 'Example Post About Something', 'md');

      fs.mkdirSync(pathName, 0777);
      paths.forEach(function(p) {
        fs.mkdirSync(path.join(pathName, p), 0777);
      });

      fs.writeFileSync(path.join(pathName, '_config.json'), this.defaultConfig());
      fs.writeFileSync(path.join(pathName, 'index.jade'), this.defaultIndex());
      fs.writeFileSync(path.join(pathName, '_layouts', 'default.jade'), this.defaultLayout());
      fs.writeFileSync(path.join(pathName, '_layouts', 'post.jade'), this.defaultPostLayout());
      fs.writeFileSync(path.join(pathName, 'stylesheets', 'screen.styl'), this.defaultStylus());
      fs.writeFileSync(path.join(pathName, postFileName), this.samplePost());

      console.log('Site created:', pathName);
      fn();
    }
  }
};
