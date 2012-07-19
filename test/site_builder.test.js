var assert = require('assert')
  , path = require('path')
  , fs = require('fs')
  , os = require('os')
  , pop = require(__dirname + '/../lib/pop')
  , SiteBuilder = require(__dirname + '/../lib/site_builder')
  , config;

config = {
  permalink: '/:year/:month/:day/:title'
, paginate: 20
, exclude: ['run\.js', '\.swp']
, root: path.join(__dirname, 'fixtures', 'test_site')
, output: path.join(os.tmpDir(), 'pop-tests', (new Date).getTime().toString() + '-site-builder')
, autoGenerate: [{'feed': 'feed.xml'}] // Should be ignored with 0 posts
, url: 'http://example.com/'
, title: 'My Site'
};

exports['test SiteBuilder generates a simple site correctly'] = function(done) {
  var siteBuilder = pop.generateSite(config, false);
  siteBuilder.on('ready', function() {
    var html = fs.readFileSync(config.output + '/index.html', 'utf8');
    assert.ok(html.match(/Welcome to my site/));
    done();
  });
};

exports['test isRenderedFile'] = function() {
  var siteBuilder = new SiteBuilder(config);

  assert.ok(siteBuilder.isRenderedFile({ type: 'file jade' }));
  assert.ok(!siteBuilder.isRenderedFile({ type: 'file' }));
};

exports['test SiteBuilder generates a simple site correctly with a dot in the path'] = function(done) {
  var configClone, siteBuilder;
 
  configClone = {
    permalink: '/:year/:month/:day/:title'
  , paginate: 20
  , exclude: ['run\.js', '\.swp']
  , root: path.join(__dirname, 'fixtures', 'test.site')
  , output: path.join(os.tmpDir(), 'pop-tests', (new Date).getTime().toString() + '-test.site')
  , autoGenerate: [{'feed': 'feed.xml'}] // Should be ignored with 0 posts
  , url: 'http://example.com/'
  , title: 'My Site'
  };
 
  siteBuilder = pop.generateSite(configClone, false);

  siteBuilder.on('ready', function() {
    var html = fs.readFileSync(configClone.output + '/index.html', 'utf8');
    assert.ok(html.match(/Welcome to my site/));
    done();
  });
};

