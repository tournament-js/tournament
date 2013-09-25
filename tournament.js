var helpers = require('./lib/public')
  , algs = require('./lib/balancer');

var t = {
  FFA: require('./ffa'),
  Duel: require('./duel'),
  KnockOut: require('./knockout'),
  GroupStage: require('./groupstage'),
  TieBreaker: require('./lib/tiebreak_groups'),

  groups: algs.groups,
  robin: algs.robin,
};

Object.keys(helpers).forEach(function (key) {
  if(key !== "prototype") {
    t[key] = helpers[key];
  }
});

module.exports = t;
