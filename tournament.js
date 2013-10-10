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

module.exports = t;
