var Duel = require('./lib/duel.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  Duel[key] = helpers[key];
});

module.exports = Duel;
