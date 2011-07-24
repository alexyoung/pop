var assert = require('assert')
  , path = require('path')
  , fs = require('fs')
  , pop = require(__dirname + '/../lib/pop')
  , SiteBuilder = require(__dirname + '/../lib/site_builder')
  , config;

config = {
  permalink: '/:year/:month/:day/:title'
, paginate: 20
, exclude: ['run\.js', '\.swp']
, root: path.join(__dirname, 'fixtures', 'test_site')
, output: path.join('/tmp', 'pop-tests', (new Date).getTime().toString() + '-site-builder')
, autoGenerate: [{'feed': 'feed.xml'}] // Should be ignored with 0 posts
};

exports['test SiteBuilder generates a simple site correctly'] = function(beforeExit) {
  var siteBuilder = pop.generateSite(config, false);

  beforeExit(function() {
    var html = fs.readFileSync(config.output + '/index.html', 'utf8');
    assert.match(html, /Welcome to my site/);
  });
};

exports['test isRenderedFile'] = function() {
  var siteBuilder = new SiteBuilder(config);

  assert.ok(siteBuilder.isRenderedFile({ type: 'file jade' }));
  assert.ok(!siteBuilder.isRenderedFile({ type: 'file' }));
};
