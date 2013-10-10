var Base = require('./lib/base.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  Base[key] = helpers[key];
});

module.exports = Base;

