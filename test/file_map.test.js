var assert = require('assert')
  , path = require('path')
  , FileMap = require(path.join(__dirname, '..', 'lib', 'file_map'))
  , config
  , fileMap;

config = {
  permalink: '/:year/:month/:day/:title'
, paginate: 20
, exclude: ['run\.js', '\.swp']
, root: path.join(__dirname, 'fixtures', 'test_site')
};

fileMap = new FileMap(config);
fileMap.walk();

exports['test FileMap finds files'] = function(beforeExit) {
  fileMap.on('ready', function() {
    assert.ok(true);
  });

  beforeExit(function() {
    // Make sure the correct amount of files have been found
    assert.equal(fileMap.files.length, 15);
  });
};

