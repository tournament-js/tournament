var KnockOut = require('./lib/knockout.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  KnockOut[key] = helpers[key];
});

module.exports = KnockOut;
