var algs = require('./lib/balancer');

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

module.exports = t;
