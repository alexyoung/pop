/*!
 * Pop - Configuration module.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Config file reader.
 *
 * @param {String} Config file name
 * @return {Object} Parsed JavaScript object
 */
function readConfigFile(file) {
  var defaults = {
    perPage: 20
  , port: 4000
  , output: '_site/'
  };

  function applyDefaults(config) {
    for (var key in defaults) {
      config[key] = config[key] || defaults[key];
    }

    if (config.url) config.url = config.url.replace(/\/$/, '');

    return config;
  }

  try {
    var data = fs.readFileSync(file).toString();
    return applyDefaults(JSON.parse(data));
  } catch(exception) {
    if (exception.code === 'EBADF') {
      console.error('No _config.json file in this directory.  Is this a Pop site?');
      process.exit(1);
    } else {
      console.log('Error reading config:', exception.message);
      throw(exception);
    }
  }
}

/**
 * Module dependencies and additional config variables.
 */
var fs = require(__dirname + '/graceful');

module.exports = readConfigFile;
