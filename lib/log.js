module.exports = {
  enabled: true,

  info: function() {
    if (this.enabled) console.log.apply(this, arguments);
  },

  error: function() {
    if (this.enabled) console.error.apply(this, arguments);
  }
};
