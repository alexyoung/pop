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

exports['test FileMap finds files'] = function(done) {
  fileMap = new FileMap(config);
  fileMap.walk();

  fileMap.on('ready', function() {
    assert.equal(fileMap.files.length, 15);
    done();
  });
};

var filterFilesByType = function(type, cb) {
  fileMap = new FileMap(config);
  fileMap.walk();
  fileMap.on('ready', function() {
    var files = fileMap.files.filter(function(file) {
      return file.type.indexOf('post') !== -1;
    });
    cb(files);
  });
}

exports['test FileMap finds posts'] = function(done) {
  filterFilesByType('post', function(files) {
    assert.equal(files.length, 2);
    done();
  });
}

