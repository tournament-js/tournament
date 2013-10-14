var helpers = require('./lib/public')
  , algs = require('./lib/balancer');

var t = {
  Base: require('./lib/base'),
  FFA: require('./lib/ffa'),
  Duel: require('./lib/duel'),
  KnockOut: require('./lib/knockout'),
  GroupStage: require('./lib/groupstage'),
  TieBreaker: require('./lib/tiebreak_groups'),

  groups: algs.groups,
  robin: algs.robin
};

Object.keys(helpers).forEach(function (key) {
  t[key] = helpers[key];
});

// A general parser that will find out which tournament type to parse it as
t.parse = function (str) {
  var data = JSON.parse(str);
  if (data.type == null) {
    // NB: First time parsing of old ones need to go to the specific class
    throw new Error("Need to migrate over pre1.0 serialized tournaments");
  }
  if (typeof t[data.type] !== 'function') {
    throw new Error("Invalid tournament type: " + data.type);
  }
  return t[data.type].parse(data);
};

module.exports = t;
