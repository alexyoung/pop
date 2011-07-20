/*!
 * Pop - Serves a generated site using Express.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Module dependencies and local variables.
 */
var path = require('path')
  , watch = require('nodewatch')
  , siteBuilder;

/**
 * Instantiates and runs the Express server.
 */
function server() {
  // TODO: Show require express error
  var express = require('express'),
      app = express.createServer();

  app.configure(function() {
    app.use(express.static(siteBuilder.outputRoot));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  // Map missing trailing slashes for posts
  app.get('*', function(req, res) {
    var postPath = siteBuilder.outputRoot + req.url + '/';
    // TODO: Security
    if (req.url.match(/[^/]$/) && path.existsSync(postPath)) {
      res.redirect(req.url + '/');
    } else {
      res.send('404');
    }
  });

  // TODO: Config
  app.listen(4000);
  console.log('Listening on port 4000');
}

/**
 * Watches for file changes and regenerates files as required.
 * TODO: Work in progress
 */
function watchChanges() {
  // TODO: What happens when files are added?
  // TODO: Other directories?
  watch
    .add(siteBuilder.root)
    .add(path.join(siteBuilder.root, '_posts'))
    .onChange(function(file) {
      console.log('File changed:', file);
      siteBuilder.buildChange(file);
    });
}

module.exports = function(s) {
  siteBuilder = s;
  return {
    run: server
  , watch: watchChanges
  };
};

