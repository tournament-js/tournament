var $ = require('interlude')
  , T = require('./common');

var resultsByGroup = function (results) {
  var res = [];
  for (var i = 0; i < results.length; i += 1) {
    var r = results[i];
    if (!res[r.grp-1]) {
      res[r.grp-1] = [];
    }
    res[r.grp-1].push(r);
  }
  return res;
};

// returns an array (one per group) of [0: seedAry1, 1: seedAry2, ...]
// s.t. indexes are 0-indexed gpos, seedArys are seeds of players in gpos idx+1
var posByGroup = function (bgRes) {
  var res = []; // also by group, so can build up in parallel with the bgRes loop
  for (var i = 0; i < bgRes.length; i += 1) {
    var grp = bgRes[i];
    res[i] = $.replicate(grp.length, []); // every possible gpos neds an array

    // if no ties, then each sub array of res[i]
    for (var k = 0; k < grp.length; k += 1) {
      var p = grp[k];
      res[i][p.gpos-1].push(p.seed);
    }
  }
  return res;
};

var invalid = function (results, limit) {
  if (!Array.isArray(results)) {
    return "need GroupStage results array";
  }
  if (!Number.isFinite(limit) || limit < 1 || limit >= results.length) {
    return "limit must be an integer in the range 1 <= limit < results.length";
  }
  for (var i = 0; i < results.length; i += 1) {
    var r = results[i];
    if (![r.seed, r.pts, r.maps, r.gpos, r.grp, r.pos].every(Number.isFinite)) {
      return "invalid GroupStage results - common properties missing";
    }
  }
  return null;
};

/**
 * FFA tiebreakers
 *
 * creates 2 kind of tiebreakers
 * 1. Within groups (necessary for the latter)
 * 2. Between groups
 *
 * Because of the complexity of having subgroups tie and then redoing sub groupstages
 * with a reduced number is so high, we leave tiebreaking up to the indivudual host.
 *
 * Thus we only provide at most 2 matches for each player:
 * 1. One match FOR EACH GROUP to tiebreak the groups (which are filled if needed)
 * 2. One match for the between groups x-placers tiebreak
 *
 * These matches must be entered scores to represent the actual tiebreaker event.
 * NO SCORES THEREIN CAN TIE.
 * Results (advancers) can be picked from last match (from 2.)
 */

//ids: (ignoring the groups match 1 is in and putting it into m instead)
// 1. {s:0, r:1, m:s} // s because one match per group
// 2. {s:0, r:2, m:1} // round 2 because winners go to next tiebreaker
// NB: ok to have s==0 for TBs because these are not sorted with the rest...

var createTbForGroups = function (results, limit) {
  var invReason = invalid(results, limit);
  if (invReason !== null) {
    console.error("invalid TieBreaker configuration: %dp from GroupStage results %j"
      , limit, results);
    console.error("reason: ", invReason);
    return [];
  }

  var res = resultsByGroup(results);
  var posAry = posByGroup(res);

  var numGroups = res.length;
  var perGroup = Math.floor(limit / numGroups);
  var rem = limit % numGroups;
  var ms = [];

  // need group match if the current group has duplicate gpos <= perGroup
  // - create that match for the duplicates
  // - put non-duplicates with gpos < perGroup directly into `proceeders`
  for (var k = 0; k < numGroups; k += 1) {
    var grpPos = posAry[k];
    var unchosen = perGroup; // need to choose this many (and sometimes 1 more)

    for (var i = 0; i < perGroup; i += 1) {
      var posXs = grpPos[i]; // all players in position (i+1)
      /*
      Depending on how many ties there are in this group (via lengths in grpPos)
      we may need to create a tiebreaker match for this group:
      If we can distinguish a cluster <= unchosen in size, no need to tiebreak group
      If not, put last cluster in a tiebreaker
      */
      if (posXs.length <= unchosen) {
        unchosen -= posXs.length; // next cluster must fit or be broken as well
        if (!unchosen) {
         break; // this group is fine - grpPos chunks perfectly fit into perGroup
        }
      }
      else if (posXs.length === 1 && unchosen === 0 && rem > 0) {
        // we do not need to tiebreak the one that will go to the between match
        // because by above prop, there is only one from this group
        break; // this group fine as well - chunks before fit into perGroup
      }
      else if (posXs.length > unchosen) {
        // any other type where the chunks doesnt fit, we need to tiebreak
        // this chunk doesnt fit, need to tiebreak it
        ms.push({id: {s:0, r:1, m:k+1}, p: posXs});
        break; // done what we needed for this group
      }
    }
  }

  // need between match when we don't pick a multiple of numGroups
  if (rem > 0 && ms.length > 0) {
    ms.push({id: {s:0, r:2, m:1}, p: $.replicate(numGroups, T.NA)});
  }
  else if (rem > 0) {
    // in this case we know who starts out in R2 - everyone at gpos perGroup+1
    // we know this position is untied because ms.length === 0 here
    var r2ps = [];
    for (var j = 0; j < numGroups; j += 1) {
      if (posAry[j][perGroup].length !== 1) {
        throw new Error("internal TieBreaker error - round 1 still tied!");
      }
      // group j, at gpos perGroup+1 (0 index'd) - know length is 1 so take head
      r2ps.push(posAry[j][perGroup][0]);
    }
    r2ps.sort($.compare());
    ms.push({id: {s:0, r:2, m:1}, p: r2ps});
  }

  return ms;
};

var score = function (ms, id, scs) {
  // TODO: invReason + unscorable
  var m = T.findMatch(ms, id);
  m.m = scs; // only map scores are relevant for progression
};

var results = function (ms, oldRes, limit) {
  var oldbg = resultsByGroup(oldRes);

  var numGroups = oldbg.length;
  var perGroup = Math.floor(limit / numGroups);
  var rem = limit % numGroups;

  var res = [];
  // loop through x-placers while x*numGroups <= limit
  // if no duplicates for gpos x, then can push x-placer into res

  // otherwise need to wait for tiebreaker for position x
  // (and in this case we can't really tell more than original res)

  // if all x-placers were pushed and we are only waiting for between match
  // then we have learned something, and can lastly push players in between match
  // it won't be complete (and between res will push up some of them)
  // but it maintains conventions
  return res;

};

/*
Tiebreaker class needs to:
cache results
? cache temporary new results (obtained from progress merged with old results)
=> fromJSON needs matches + old results
-> can probably always remake the new (perhaps not yet done) results in `results`

/*
too complex to handle tiebreakers automatically
just provide an FFA like match for each tiebreaker

:one match per group for THE within breaker
:one match between for THE between breaker

then people can do as they please..
and it should be easy to interface with as well if done right
*/


// needs final gsResults
function TieBreaker(gsResults, limit) {
  this.limit = limit;
  this.old = gsResults;
  this.matches = createTbForGroups(gsResults, limit);
}

TieBreaker.invalid = invalid;

TieBreaker.isNecessary = function (gsResults, limit) {
  // for now - about as expensive to actually do it anyway
  return (createTbForGroups(gsResults, limit).length > 0);
};

TieBreaker.prototype.score = function (id, scrs) {
  return score(this.matches, id, scrs);
};

TieBreaker.prototype.results = function () {
  return results(this.matches, this.old, this.limit);
};

module.exports = TieBreaker;
