var assert = require('assert')
  , path = require('path')
  , fs = require(__dirname + '/../lib/graceful')
  , readConfigFile = require(__dirname + '/../lib/config')
  , config;

// Notice the leading slash is removed from the test result
config = {"permalink":"/:year/:month/:day/:title","perPage":20,"url":"http://example.com","exclude":["run\\.js","\\.swp"],"port":4000,"output":"_site/"};

exports['test readConfigFile'] = function() {
  assert.deepEqual(config, readConfigFile(__dirname + '/fixtures/test_site/_config.json'));
};

