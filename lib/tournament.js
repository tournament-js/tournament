var T = require('./common')
  , g = require('./groups')

var tournament = {
  FFA         : require('./ffa')
, Duel        : require('./duel')
, GroupStage  : g.GroupStage

, groups      : g.groups
, robin       : g.robin
};

// add constants as unmodifiable properties
['WB', 'LB', 'NA', 'WO'].forEach(function (key) {
  Object.defineProperty(tournament, key, {
    value : T[key]
  , writable : false
  , enumerable : true
  , configurable : false
  });
});

module.exports = tournament;

// -----------------------------------------------------------------------------
// general schemas that are being followed

// enforce max power 7 for sensibility
// => max r = 256 (in GFG2), max m = 128 (in R1), max p = 128
/*var Match = new Schema({
  id : {
    s   : {type: Number, required: true, min: 1} // section: bracket or group
  , r   : {type: Number, required: true, min: 1, max: 256}
  , m   : {type: Number, required: true, min: 1, max: 128}
  }
, r  : String // straigt from T.representation
, d  : Date   // scheduled play date

  // the following are ordered jointly and can be zipped
, p  : [Number]   // should be between 1 and 128 to match nice seed numbers
, m  : [Number]   // map wins in duel and sum/overall match result in ffa
, s  : [[Number]] // scores list of map results one score list per player
});

// higher level structure
var Tournament = new Schema({
  matches : [Match]
, ongoing : Boolean
, results : [PlayerResult] // from one of the results functions
, system  : Number    // scoring system: time asc, time desc, points asc, points desc
, size    : Number    // number of players (keeps structure simple and disjoint from invitemaps..)
});

var PlayerResult = new Schema({
  seed   : Number // in {1, .. , size}
, pos    : Number // final tournament position
, maps   : Number // number of maps taken in duel
, sum    : Number // sum of results in ffa
, best   : Number // best match score (from all matching match.r entries)
, wins   : Number // number of match wins
});*/

