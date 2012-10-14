require('logule').init(module, 'tournament')

var consts = require('./common')
  , groups = require('./groups');

var tournament = {
  FFA         : require('./ffa')
, Duel        : require('./duel')
, GroupStage  : groups.GroupStage

, groups      : groups.groups
, robin       : groups.robin
};

// add constants as unmodifiable properties
['WB', 'LB', 'NA', 'WO'].forEach(function (key) {
  Object.defineProperty(tournament, key, {
    value : consts[key]
  , writable : false
  , enumerable : true
  , configurable : false
  });
});

module.exports = tournament;

