var FFA = require('./lib/ffa.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  FFA[key] = helpers[key];
});

module.exports = FFA;

