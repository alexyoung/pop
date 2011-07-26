/*!
 * Pop - Main file used by the `pop` binary.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Module dependencies and local variables.
 */
var path = require('path')
  , fs = require(__dirname + '/../lib/graceful')
  , FileMap = require(__dirname + '/file_map')
  , SiteBuilder = require(__dirname + '/site_builder')
  , cliTools = require(__dirname + '/cli_tools')
  , readConfig = require(__dirname + '/config')
  , usage
  , args = process.argv.slice(2);

usage  = 'pop is a static site builder.\n\n';
usage += 'Usage: pop [command] [options]\n';
usage += 'new    path           Generates a new site at path/\n';
usage += 'post   "Post Title"   Writes a new post file\n'; 
usage += 'render pattern        Renders files that match "pattern"\n'; 
usage += 'server                Create a server on port 4000 for _site/\n\n';
usage += '-v, --version         Display version and exit\n';
usage += '-h, --help            Shows this message\n';

/**
 * Loads the config script and sets the local variable.
 *
 * @return {Object} Config object
 */
function loadConfig() {
  var root = process.cwd()
    , config = readConfig(path.join(root, '_config.json'));
  config.root = root;
  return config;
}

/**
 * Loads configuration then runs `generateSite`.
 *
 * @params {Boolean} Use a HTTP sever?
 */
function loadConfigAndGenerateSite(useServer) {
  generateSite(loadConfig(), useServer);
}

/**
 * Runs `FileMap` and `SiteBuilder` based on the config.
 *
 * @params {Object} Configuration options
 * @params {Boolean} Use a HTTP sever?
 * @return {SiteBuilder} A `SiteBuilder` instance
 */
function generateSite(config, useServer) {
  var fileMap = new FileMap(config)
    , siteBuilder = new SiteBuilder(config)
    , server = require(__dirname + '/server')(siteBuilder);

  fileMap.walk();
  fileMap.on('ready', function() {
    siteBuilder.fileMap = fileMap;
    siteBuilder.build();
  });

  siteBuilder.on('ready', function() {
    if (useServer) {
      server.run();
      server.watch();
    }
  });

  return siteBuilder;
}

module.exports = function() {
  if (args.length === 0) return loadConfigAndGenerateSite();

  while (args.length) {
    arg = args.shift();
    switch (arg) {
      case 'server':
        loadConfigAndGenerateSite(true);
      break;
      case 'post':
        cliTools.makePost(loadConfig(), args.shift(), function() { process.exit(0); });
      break;
      case 'new':
        cliTools.makeSite(args.shift(), function() { process.exit(0); });
      break;
      case 'render':
        return cliTools.renderFile(module.exports, loadConfig(), args.shift());
      break;
      case '-v':
      case '--version':
        var version = JSON.parse(fs.readFileSync(__dirname + '/../package.json')).version;
        console.log('pop version:', version);
        process.exit(0);
      break;
      case '-h':
      case '--help':
        console.log(usage);
        process.exit(1);
      default:
        loadConfigAndGenerateSite();
    }
  }
};

module.exports.SiteBuilder = SiteBuilder;
module.exports.FileMap = FileMap;
module.exports.generateSite = generateSite;
module.exports.cliTools = cliTools;
