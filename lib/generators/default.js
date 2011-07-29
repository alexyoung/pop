var fs = require('fs')
  , path = require('path')
  , log = require(__dirname + '/../log');

var generator = {
  run: function(helpers, pathName, fn) {
    var paths = ['_posts', '_lib', '_layouts', '_includes', 'stylesheets']
      , postFileName = helpers.getPostFileName('/:year/:month/:day/:title', new Date(), 'Example Post About Something', 'md');

    fs.mkdirSync(pathName, 0777);
    paths.forEach(function(p) {
      fs.mkdirSync(path.join(pathName, p), 0777);
    });

    fs.writeFileSync(path.join(pathName, '_config.json'), helpers.defaultConfig());
    fs.writeFileSync(path.join(pathName, 'index.jade'), helpers.defaultIndex());
    fs.writeFileSync(path.join(pathName, '_layouts', 'default.jade'), helpers.defaultLayout());
    fs.writeFileSync(path.join(pathName, '_layouts', 'post.jade'), helpers.defaultPostLayout());
    fs.writeFileSync(path.join(pathName, 'stylesheets', 'screen.styl'), helpers.defaultStylus());
    fs.writeFileSync(path.join(pathName, postFileName), helpers.samplePost());

    log.info('Site created:', pathName);
    fn();
  }
};

module.exports = generator;
