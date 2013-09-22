var FFA = require('./lib/ffa.js');
var helpers = require('./lib/public');
var T = require('./lib/common');

Object.keys(helpers).forEach(function (key) {
  if(key === "prototype") {
    Object.keys(helpers.prototype).forEach(function (key) {
      FFA.prototype[key] = helpers.prototype[key];
    });
  } else {
    FFA[key] = helpers[key];
  }
});

module.exports = FFA;

