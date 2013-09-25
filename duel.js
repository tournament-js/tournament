var Duel = require('./lib/duel.js');
var helpers = require('./lib/public');

Object.keys(helpers).forEach(function (key) {
    if(key === "prototype") {
    Object.keys(helpers.prototype).forEach(function (key) {
      Duel.prototype[key] = helpers.prototype[key];
    });
  } else {
    Duel[key] = helpers[key];
  }
});

module.exports = Duel;
