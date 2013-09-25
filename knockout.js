var KnockOut = require('./lib/knockout.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  if(key === "prototype") {
    Object.keys(helpers.prototype).forEach(function (key) {
      KnockOut.prototype[key] = helpers.prototype[key];
    });
  } else {
    KnockOut[key] = helpers[key];
  }
});

module.exports = KnockOut;
