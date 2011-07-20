var assert = require('assert')
  , filters = require(__dirname + '/../lib/filters');

exports['test highlight'] = function() {
  var test = ''
    + '{% highlight javascript %}\n'
    + 'var a = 1;\n'
    + '{% endhighlight %}';

  var html = ''
    + '<pre class="prettyprint lang-javascript">\n'
    + 'var a = 1;\n'
    + '</pre>';

  assert.equal(html, filters.highlight(test));
};

