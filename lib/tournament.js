require('logule').init(module, 'tournament');

var consts = require('./common')
  , algs = require('./balancer');

var tournament = {
  FFA         : require('./ffa'),
  Duel        : require('./duel'),
  KnockOut    : require('./knockout'),
  GroupStage  : require('./groupstage'),
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
