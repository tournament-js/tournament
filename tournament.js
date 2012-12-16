require('logule').init(module, 'tournament');

var consts = require('./lib/common')
  , algs = require('./lib/balancer');

var tournament = {
  FFA         : require('./lib/ffa'),
  Duel        : require('./lib/duel'),
  KnockOut    : require('./lib/knockout'),
  GroupStage  : require('./lib/groupstage'),
  groups      : algs.groups,
  robin       : algs.robin
};

// add constants as unmodifiable properties
['WB', 'LB', 'NA', 'WO'].forEach(function (key) {
  Object.defineProperty(tournament, key, {
    value : consts[key],
    writable : false,
    enumerable : true,
    configurable : false
  });
});

module.exports = tournament;
