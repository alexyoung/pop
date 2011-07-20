var assert = require('assert')
  , path = require('path')
  , fs = require(__dirname + '/../lib/graceful')
  , readConfigFile = require(__dirname + '/../lib/config')
  , config;

config = {"permalink":"/:year/:month/:day/:title","paginate":20,"exclude":["run\\.js","\\.swp"],"perPage":20}; 

exports['test readConfigFile'] = function() {
  assert.deepEqual(config, readConfigFile(__dirname + '/fixtures/test_site/_config.json'));
};
