var $ = require('interlude')
  , algs = require('./balancer')
  , T = require('./common');

var resultsByGroup = function (oldRes) {
  var res = [];
  for (var i = 0; i < oldRes.length; i += 1) {
    var r = oldRes[i];
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
      $.insert(res[i][p.gpos-1], p.seed);
    }
  }
  return res;
};

var invalid = function (oldRes, limit) {
  if (!Array.isArray(oldRes)) {
    return "need GroupStage results array";
  }
  if (!Number.isFinite(limit) || limit < 1 || limit >= oldRes.length) {
    return "limit must be an integer in the range 1 <= limit < results.length";
  }
  var poss = [];
  for (var i = 0; i < oldRes.length; i += 1) {
    var r = oldRes[i];
    if (![r.seed, r.pts, r.maps, r.gpos, r.grp, r.pos].every(Number.isFinite)) {
      return "invalid GroupStage results - common properties missing";
    }
    poss.push(r.pos);
  }
  if (poss.indexOf(1) < 0) {
    return "finish GroupStage before requesting tiebreakers";
  }
  return null;
};

var idString = function (id) {
  if (id.r === 1) {
    return "Group " + id.m + " tiebreaker";
  }
  return "Between groups tiebreaker";
};

// given untied R1 (reflected in posAry) generate players in R2
var generateR2 = function (posAry, numGroups, perGroup) {
  var r2ps = [];
  for (var j = 0; j < numGroups; j += 1) {
    if (posAry[j][perGroup].length !== 1) {
      throw new Error("internal TieBreaker error - round 1 still tied!");
    }
    // group j, at gpos perGroup+1 (0 index'd) - know length is 1 so take head
    r2ps.push(posAry[j][perGroup][0]);
  }
  r2ps.sort($.compare());
  return r2ps;
};

/**
 * FFA tiebreakers
 *
 * creates 2 kind of tiebreakers
 * 1. Within groups (necessary for the latter)
 * 2. Between groups
 *
 * Because of the complexity of having subgroups tie and then redoing sub groupstages
 * with a reduced number is so high, we leave tiebreaking up to the individual host.
 *
 * Thus we only provide at most 2 matches for each player:
 * 1. One match FOR EACH GROUP to tiebreak the groups (which are filled if needed)
 * 2. One match for the between groups x-placers tiebreak
 *
 * These matches must be entered scores to represent the actual tiebreaker event.
 * NO SCORES THEREIN CAN TIE.
 * Results (advancers) can be picked from last match (from 2.)
 */
var createTbForGroups = function (posAry, limit) {
  var numGroups = posAry.length;
  var perGroup = Math.floor(limit / numGroups);
  var rem = limit % numGroups;
  var ms = [];

  // need group match if the current group has duplicate gpos <= perGroup
  // - create that match for the duplicates
  // - put non-duplicates with gpos < perGroup directly into `proceeders`
  for (var k = 0; k < numGroups; k += 1) {
    var grpPos = posAry[k];
    var unchosen = perGroup; // need to choose this many (and sometimes 1 more)

    // loop over perGroup + 1 (though last irrelevant if !rem)
    // and there's always a grpPos[i] because limit < numGroups
    for (var i = 0; i <= perGroup; i += 1) {
      var posXs = grpPos[i]; // all players in position (i+1)
      /*
      Depending on how many ties there are in this group (via lengths in grpPos)
      we may need to create a tiebreaker match for this group:
      If we can distinguish a cluster <= unchosen in size, no need to tiebreak group
      If not, put last cluster in a tiebreaker
      */
      if (posXs.length <= unchosen) {
        unchosen -= posXs.length; // next cluster must fit or be broken as well
        if (!unchosen && !rem) {
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
    var r2ps = generateR2(posAry, numGroups, perGroup);
    ms.push({id: {s:0, r:2, m:1}, p: r2ps});
  }

  return ms;
};


var unscorable = function (ms, id, score, allowPast) {
  var m = T.findMatch(ms, id);
  if (!m) {
    return "match not found in tournament";
  }
  if (m.p.some($.eq(T.NA))) {
    return "cannot score unprepared match with missing players";
  }
  if (!Array.isArray(score) || score.length !== m.p.length)  {
    return "scores must be an array of same length as match's player array";
  }
  if (!score.every(Number.isFinite)) {
    return "scores array must be numeric";
  }
  if ($.nub(score).length !== score.length) {
    return "scores must unambiguous decide every position";
  }
  if (!allowPast && Array.isArray(m.m)) {
    return "cannot re-score match";
  }
  return null;
};


// same as posByGroup but takes the result of posByGroup
// and additionally a scored round 1 so that the clusters can be split at borders
// it does return the full re-scored posAry (accounting for r1) even though
// score only needs the border results to progress to r2.
// it does this because it makes it a lot easier for `results`
var posByGroup2 = function (posAry, r1) {
  var res = []; // also by group, so can build up in parallel with the bgRes loop
  for (var i = 0; i < posAry.length; i += 1) {
    var posG = posAry[i];

    var m = T.findMatch(r1, {s:0, r:1, m: i+1});
    if (!m) {
      // group did not require tiebreakers so we can safely pick from old posAry
      res[i] = posG.slice(); // copy entire posAry element for this group
      continue;
    }

    // get seeds in order of map scores (know scores are untied so sort fine)
    var zip = $.zip(m.p, m.m).sort(T.compareZip).map($.get(0));

    // create a modified entry at index i
    res[i] = $.replicate(posG.length, []);
    for (var k = 0; k < posG.length; ) {
      var p = posG[k];
      // if any one player is in this tiebreaker for this group
      // then this is the cluster that corresponds to the match - check first
      if (m.p.indexOf(p[0]) >= 0) {
        // this is the cluster that was tied - now unbroken
        for (var j = 0; j < p.length; j += 1) {
          res[i][k + j] = [zip[j]]; // pos k+j is the player that scored jth in m
        }
        k += p.length;
      }
      else {
        // just copy, the tied cluster has been taken care of above..
        res[i][k] = p.slice();
        k += 1;
      }
    }
  }
  return res;
};

var score = function (ms, posAry, limit, id, scs) {
  // 0. error handling - if this fails client didnt guard so we log
  var invReason = unscorable(ms, id, scs, true);
  if (invReason !== null) {
    console.error("failed scoring TieBreaker match %s with %j", idString(id), scs);
    console.error("reason:", invReason);
    return false;
  }

  var m = T.findMatch(ms, id);
  m.m = scs; // only map scores are relevant for progression

  // if id.r === 1, we need to do some analysis to get who's in R2 (if it exists)
  var last = ms[ms.length-1];
  if (id.r === 1 && last.id.r === 2) {
    var r1 = ms.slice(0, -1); // only one match in R2
    if (r1.every($.get('m'))) {
      var numGroups = posAry.length;
      var perGroup = Math.floor(limit / numGroups);
      var posAry2 = posByGroup2(posAry, r1);
      var r2ps = generateR2(posAry2, numGroups, perGroup);
      last.p = r2ps;
    }
  }
  return true;
};

var results = function (ms, posAry, oldRes, mapsBreak) {
  var last = ms[ms.length-1];
  var hasR2 = (last.id.r === 2);
  var r1 = hasR2 ? ms.slice(0, -1) : ms;
  if (!r1.every($.get('m'))) {
    return oldRes; // results in the middle of or before r1 are nonsensical
  }

  // at least one r1 match done, so make new res and update the copy
  var res = [];
  oldRes.forEach(function (r) {
    res.push($.extend({}, r));
  });

  var getEntry = function (seed) {
    var idx = -1;
    for (var i = 0; i < res.length; i += 1) {
      if (res[i].seed === seed) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      throw new Error("old results does not contain seed " + seed);
    }
    return res[idx];
  };

  var getPlayersAbove = function (grpNum, gpos) {
    return oldRes.filter(function (r) {
      return (r.grp === grpNum && r.gpos < gpos);
    }).length;
  };

  //var numGroups = posAry.length;
  //var perGroup = Math.floor(limit / numGroups);
  //var rem = limit % numGroups;

  // r1 matches determine gpos for the tied cluster at limit border
  var r1gposAdjust = function () {
    for (var i = 0; i < ms.length; i += 1) {
      var m = ms[i];
      if (m.id.r !== 1) {
        continue;
      }
      var top = $.zip(m.p, m.m).sort(T.compareZip).map($.get(0));
      for (var j = 0; j < top.length; j += 1) {
        var p = top[j];
        var resEl = getEntry(p);
        var playersAbove = getPlayersAbove(i+1, resEl.gpos);
        resEl.gpos = j + playersAbove + 1;
      }
    }
  };
  r1gposAdjust();


  // get a partial posAry2 - and replicate GroupStage results bit to be fair
  // this is sensible because we only do this after R1 is DONE
  var posAry2 = posByGroup2(posAry, r1);
  // split posAry2 into xplacers array (similar to the one in GroupStage)
  var xarysFlat = [];
  posAry2.forEach(function (grp) {
    grp.forEach(function (gxp, i) {
      if (!xarysFlat[i]) {
        xarysFlat[i] = [];
      }
      xarysFlat[i] = xarysFlat[i].concat(gxp);
    });
  });

  // now replace expand xarysFlat with res entries so that we can use same algorithms
  // as in GroupStage
  var xarys = xarysFlat.map(function (xplacers) {
    return xplacers.map(getEntry);
  });

  // then do the full tieCompute reduction that accounts for points and maps
  xarys.reduce(function (currPos, xplacers) {
    xplacers.sort($.comparing('pts', -1, 'maps', -1, 'seed', +1));

    // we can identify the R2 match players as a cluster
    // i.e. last.p ==== seeds from xplacers
    // because posAry2 will have resolved within clusters that are relevant
    // so the xplacer array only refers to the xplacers at the limit point
    // in the case when the limit point does not divide numGroups
    var inBetweenCluster = (hasR2 && last.p.indexOf(xplacers[0].seed) >= 0);
    var betweenPos;

    // TODO: verify seed sort (different from GroupStage - but GS seem overkill now)
    algs.tieCompute(xplacers, currPos, mapsBreak, function (r, pos, i) {
      if (inBetweenCluster && i === 0) {
        betweenPos = pos;
      }
      // inBetweenCluster case we want to maintain the tied position
      // because after R2 we adjust the pos manually for this specific cluster
      r.pos = inBetweenCluster ? betweenPos : pos;
    });
    return currPos += xplacers.length; // next pos needs to simply start this far off
  }, 0);


  // change .pos of the players in the R2 match if exists and played
  // TODO: bug here atm: if xarys reduction have already positioned these
  // as one better than the other, then the shift will fuck it up!
  var m2posAdjust = function () {
    if (hasR2 && last.m) {
      var top = $.zip(last.p, last.m).sort(T.compareZip).map($.get(0));
      for (var j = 0; j < top.length; j += 1) {
        var p = top[j];
        var resEl = getEntry(p);
        // top were all tied a same x-placement, so when scoring, anything but 1st
        // is a linear increase in pos (and this does not affect lower clusters)
        resEl.pos += j;
      }
    }
  };
  m2posAdjust();

  // quick way of doing the sort for r2:
  // not necessary to do the full xarys reduce again because we only changed a very
  // specific subset of the xary - so all `pos` values are correct!
  res.sort($.comparing('pos', +1, 'pts', -1, 'maps', -1, 'seed', +1));

  return res;
};

// needs final gsResults
function TieBreaker(gsResults, limit, matches) {
  var invReason = invalid(gsResults, limit);
  if (invReason !== null) {
    console.error("invalid TieBreaker configuration: %dp from GroupStage results %j"
      , limit, gsResults);
    console.error("reason: ", invReason);
  }
  else {
    var res = resultsByGroup(gsResults);
    this.posAry = posByGroup(res);
    this.oldRes = gsResults;
    this.limit = limit;
    this.matches = matches || createTbForGroups(this.posAry, limit);
  }
}

TieBreaker.fromJSON = function (matches, gsResults, limit) {
  var invReason = invalid(gsResults, limit);
  if (invReason !== null) {
    console.error("cannot recreate tournament - gsResults invalid");
    console.error("Reason:", invReason);
  }
  else {
    var tb = new TieBreaker(gsResults, limit, matches);
    return tb;
  }
};

TieBreaker.invalid = invalid;
TieBreaker.idString = idString;

// given valid (gsResults, limit) do we actually need to tiebreak to pick top limit?
TieBreaker.isNecessary = function (gsResults, limit) {
  var tb = new TieBreaker(gsResults, limit);
  return (tb.matches && tb.matches.length > 0);
};

TieBreaker.prototype.unscorable = function (id, mapScore, past) {
  return unscorable(this.matches, id, mapScore, past);
};

TieBreaker.prototype.score = function (id, scrs) {
  return score(this.matches, this.posAry, this.limit, id, scrs);
};

TieBreaker.prototype.results = function () {
  return results(this.matches, this.posAry, this.oldRes, this.limit);
};

TieBreaker.prototype.isDone = function () {
  return this.matches.every($.get('m'));
};

module.exports = TieBreaker;
