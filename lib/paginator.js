/*!
 * Pop - Simple pagination class.
 * Copyright 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * Initialize `Paginator` with the number of items per-page and a list of items.
 *
 * @param {Integer} Number of items per-page
 * @param {Object} A list of items (generally posts)
 * @api public
 */
function Paginator(perPage, items) {
  this.allItems = this.sort(items);
  this.perPage = perPage;
  this.items = this.allItems.slice(0, perPage);
  this.previousPage = 0;
  this.nextPage = 2;
  this.page = 1;
  this.pages = Math.round(this.allItems.length / this.perPage) + 1;
}

/**
 * Moves to the next page.
 *
 */
Paginator.prototype.advancePage = function() {
  this.page++;
  this.previousPage = this.page - 1;
  this.nextPage = this.page + 1;

  var start = (this.page - 1) * this.perPage
    , end = this.page * this.perPage;
  this.items = this.allItems.slice(start, end); 
};

/**
 * Sort items according to date.
 *
 * @param {Array} Array of items
 * @return {Integer} `-1`, `1`, `0` according to the date comparison
 */
Paginator.prototype.sort = function(items) {
  return items.sort(function(a, b) {
    a = a.date.valueOf();
    b = b.date.valueOf();
    if (a > b)
      return -1;
    else if (a < b)
      return 1;
    return 0;
  });
};

module.exports = Paginator;
