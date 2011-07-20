/*!
 * Pop - Built-in pre-render filters.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

module.exports = {
  /**
   * Replaces liquid tag highlight directives with prettyprint HTML tags.
   *
   * @param {String} The text for a post
   * @return {String}
   */
  highlight: function(data) {
    data = data.replace(/{% highlight ([^ ]*) %}/g, '<pre class="prettyprint lang-$1">');
    data = data.replace(/{% endhighlight %}/g, '</pre>');
    return data;
  }
};
