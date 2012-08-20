var T = require('./common')
  , g = require('./groups')
  , FFA = require('./ffa')
  , Duel = require('./duel');

//TODO: defineProperty for constants
T.groups = g.groups;
T.robin = g.robin;
T.Group = g.Group
T.FFA = FFA;
T.Duel = Duel;

module.exports = T;

// -----------------------------------------------------------------------------
// general schemas that are being followed

// enforce max power 7 for sensibility
// => max r = 256 (in GFG2), max g = 128 (in R1), max p = 128
/*var Game = new Schema({
  id : {
    b   : {type: Number, required: true, min: T.WB, max: T.LB}
  , r   : {type: Number, required: true, min: 1, max: 256}
  , g   : {type: Number, required: true, min: 1, max: 128}
  }
, r  : String // straigt from T.representation
, d  : Date   // scheduled play date

  // the following are ordered jointly and can be zipped
, p  : [Number]   // should be between 1 and 128 to match nice seed numbers
, m  : [Number]   // map wins in duel and sum/overall game result in ffa
, s  : [[Number]] // scores list of map results one score list per player
});

// higher level structure
var Tournament = new Schema({
  games   : [Game]
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
, best   : Number // best game score (from all matching game.r entries)
, wins   : Number // number of game wins
});*/

