var assert = require('assert')
  , path = require('path')
  , os = require('os')
  , Paginator = require(__dirname + '/../lib/paginator')
  , SiteBuilder = require(__dirname + '/../lib/site_builder')
  , siteBuilder
  , helpers = require(__dirname + '/../lib/helpers')
  , pop = require(__dirname + '/../lib/pop')
  , config;

assert.match = function(string, regex) {
  assert.ok(string.match(regex), string + ' does not match ' + regex);
};

config = {
  permalink: '/:year/:month/:day/:title'
, url: 'http://example.com'
, title: 'Example'
, perPage: 5
, exclude: ['run\.js', '\.swp']
, root: path.join(__dirname, 'fixtures', 'test_site')
, output: path.join(os.tmpDir(), 'pop-tests', (new Date).getTime().toString() + '-site-builder')
, autoGenerate: [{'feed': 'feed.xml'}] // Should be ignored with 0 posts
};

siteBuilder = new SiteBuilder(config);
siteBuilder.posts = [];
for (var i = 0; i < 20; i++) { siteBuilder.posts.push(makePost()); }

function makePost() {
  return {
    title: 'Test'
  , url: '/test-' + (new Date).getTime().toString()
  , date: new Date()
  , content: 'Example document content'
  , tags: ['a', 'b', 'c']
  };
}

exports['test pagination template generation'] = function() {
  var paginator
    , html
    , expected;

  paginator = new Paginator(config.perPage, siteBuilder.posts);
  html = helpers.paginate.apply(siteBuilder, [paginator]);
  
  expected = '\n<div class="pages"><span class="prev_next"><strong class="page">1</strong><a href="/page2/" class="page">2</a><a href="/page3/" class="page">3</a><a href="/page4/" class="page">4</a><a href="/page5/" class="page">5</a><a href="/page2/" class="next">Next</a><span>&rarr;</span></span>\n</div>';

  assert.equal(html, expected);
};

exports['test atom feed generation'] = function() {
  var paginator = new Paginator(config.perPage, siteBuilder.posts)
    , xml = helpers.atom.apply(siteBuilder, [config.url]);

  assert.match(xml, /<content type="html">Example document content/);
};

exports['test truncated atom feed generation'] = function() {
  var paginator = new Paginator(config.perPage, siteBuilder.posts)
    , xml = helpers.atom.apply(siteBuilder, [config.url, true]);
  assert.match(xml, /<content type="html">Example document content/);
};

exports['test RSS feed generation'] = function() {
  var paginator = new Paginator(config.perPage, siteBuilder.posts)
    , xml = helpers.rss.apply(siteBuilder, [config.url]);

  assert.match(xml, /<description>Example document content/);
};

exports['test allTags'] = function() {
  var tags = helpers.allTags.apply(siteBuilder, []);
  assert.deepEqual(['a', 'b', 'c'], tags);
};

exports['test hNews'] = function() {
  var post = helpers.hNews.apply(siteBuilder, [siteBuilder.posts[0]]);
  assert.ok(post);
};

exports['test date helpers'] = function() {
  var date = new Date(1970, 0, 1, 1, 1);
  assert.equal(helpers.ds(date), '01 January 1970');
  assert.equal(helpers.dx(date), '1970-01-01T01:01:00Z');
};

exports['test html escape'] = function() {
  assert.equal(helpers.h('<h1>Molly & Styx</h1>'), '&lt;h1&gt;Molly &amp; Styx&lt;/h1&gt;');
};

exports['test truncateParagraphs'] = function() {
  var t = helpers.truncateParagraphs('<p>A</p><p>A</p><p>A</p><p>A</p><p>A</p>', 2, 'MORE!');
  assert.equal(t, '<p>A</p><p>A</p>MORE!');
};

exports['test truncate'] = function() {
  var t = helpers.truncate('The needs of the many outweigh the needs of the few.', 10, '...');
  assert.equal(t, 'The needs...');
};

exports['test truncateWords'] = function() {
  var t = helpers.truncateWords('The needs of the many outweigh the needs of the few.', 5, '...');
  assert.equal(t, 'The needs of the many...');
};

exports['test paginatedPosts'] = function() {
  siteBuilder.paginator = new Paginator(config.perPage, siteBuilder.posts)
  var html = helpers.paginatedPosts.apply(siteBuilder, []);
  assert.match(html, /<article/);
};

exports['test postsForTag'] = function() {
  siteBuilder.paginator = new Paginator(config.perPage, siteBuilder.posts)
  var posts = helpers.postsForTag.apply(siteBuilder, ['a']);
  assert.ok(posts.length > 0);
};

