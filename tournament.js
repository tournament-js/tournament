require('logule').init(module, 'tournament');

var helpers = require('./lib/public')
  , algs = require('./lib/balancer');

var t = {
  FFA: require('./lib/ffa'),
  Duel: require('./lib/duel'),
  KnockOut: require('./lib/knockout'),
  GroupStage: require('./lib/groupstage'),

  groups: algs.groups,
  robin: algs.robin,
};

Object.keys(helpers).forEach(function (key) {
  t[key] = helpers[key];
});

module.exports = t;
