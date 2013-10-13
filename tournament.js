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

t.parse = function (str) {
  var data = JSON.parse(str);
  if (!data.type) {
    throw new Error("Cannot deserialize tournaments stored in the pre 2.0 way");
  }
  if (!t[data.type]) {
    throw new Error("Invalid tournament type: " + data.type);
  }
  return t[data.type].parse(data);
};

module.exports = t;
