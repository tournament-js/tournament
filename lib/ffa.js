var $ = require('interlude')
  , T = require('./common')
  , G = require('./groups')
  , t = require('typr');

// ffa has no concepts of sections yet so they're all 1
var representation = function (id) {
  if (!id.m) {
    return "R" + id.r + " M X";
  }
  return "R" + id.r + " M" + id.m;
};

var unspecify = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, T.NA);
  });
};

var elimination = function (np, grs, adv) {
  if (np <= 2 || grs <= 2 || np <= grs || adv >= grs || adv <= 0) {
    console.error("invalid ffa configuration: players=" + np + ", groupsize=" + grs + ", advancing=" + adv);
    return;
  }
  var matches = []
    , grps = G.groups(np, grs);

  // metric to determine the best adv for the next groups call uses 3 factors:
    // - distance from requested adv (important)
    // - how close the groups are to filled (where +2 off equally bad as -2 off)
    // - how close the implied group size is from the requested if changing adv

  // compares against the closed over grs, adv
  var cost = function (adv2, minsize, prevNumGroups) {
    var advCloseness = Math.abs(adv - adv2)
      , leftOver = prevNumGroups * adv2
      , numGroups = Math.ceil(leftOver / grs)
      , grs2 = G.reduceGroupSize(leftOver, grs, numGroups)
      , grpFillCloseness = Math.min(Math.abs((leftOver % grs2) - grs2), leftOver % grs2)
      , grpCloseness = grs - grs2; // grs >= grs2

    return 2*advCloseness + 1*grpCloseness + 2*grpFillCloseness
  };

  // create each round iteratively
  for (var r = 1; grps.length > 1; r += 1) {
    if (r > 1) {
      grps = unspecify(grps);
    }
    for (var i = 0; i < grps.length; i += 1) {
      matches.push({id: {s: 1, r: r, m: i + 1}, p: grps[i]}); // +1 as match numbers are 1-indexed
    }

    // prepare for the next round, G.groups may adjust grs internally, we find best adv
    var minsize = $.minimum($.pluck('length', grps));


    var grs2 = adv*grps.length;
    var bestA = Math.max(1, adv - (grs - minsize)); // ok starting point, 1 adv worst case fallback
    var bestCost = cost(bestA, minsize, grps.length);
    console.log("r" + r +": startA, startCost=", bestA, bestCost);
    for (var a = adv; a > 0; a -= 1) {
      if (a >= minsize) {
        continue; // need to actually eliminate something in each match..
      }
      var nCost = cost(a, minsize, grps.length);

      if (nCost < bestCost) { // better candidate
        bestCost = nCost;
        bestA = a;
      }
    }
    console.log("r" + r +": bestA, bestCost=", bestA, bestCost);
    grps = unspecify(G.groups(grps.length * bestA, grs));
  }
  matches.push({id: {s: 1, r: r, m: 1}, p: grps[0]}); // grand final
  return matches; // already sorted according to T.compareMatches
};

// how many advances from the current round (filter of ms) to the next round (ditto)
// returns adv which is <= what was requested due to model optimization
var advancing = function (currRnd, nxtRnd) {
  var slots = $.flatten($.pluck('p', nxtRnd)).length; // how many that's expected
  var adv = slots / currRnd.length; // how many to take from each group (is always divisible)
  return adv;
};

var scorable = function (ms, id) {
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (m && m.p && m.p.every($.neq(T.NA))) {
    // match exists and is ready to be scored

    var scoredInNext = ms.filter(function (m) {
      return m.id.r === id.r + 1 && m.m;
    }).length;
    return !scoredInNext;
  }
  return false;
};

// updates ms in place and returns whether or not anything changed
var score = function (ms, id, score) {
  // 0. sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (!m) {
    console.error(representation(id) + " match not found in tournament");
    return false;
  }
  if (m.p.some($.eq(T.NA))) {
    console.error("cannot score not fully filled in match: " + representation(id));
    return false;
  }
  if (!Array.isArray(score) || score.length !== m.p.length)  {
    console.error("invalid scores: must be array of player length - got: " + JSON.stringify(score));
    return false;
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric)) {
    console.error("invalid player scores: all must be numeric - got: " + JSON.stringify(score));
    return false;
  }

  // TODO: if $.nub(score).length <= numProceeding, need tiebreaks

  // 1. score match
  m.m = score; // only map scores are relevant for progression

  // if all matches in this round were scored, fill in next round's slots with the advancing players
  var currRnd = ms.filter(function (m) {
    return m.id.r === id.r;
  });
  var rndScored = currRnd.every(function (m) {
    return m.m; // map score exists
  });

  if (rndScored) {
    var nxtRnd = ms.filter(function (m) {
      return (m.id.r === id.r + 1);
    });
    var adv = advancing(currRnd, nxtRnd);

    var top = [];
    for (var i = 0; i < currRnd.length; i += 1) {
      var topAdv = $.zip(currRnd[i].p, currRnd[i].m).sort($.comparing('1', -1)).slice(0, adv);
      top = top.concat(topAdv);
    }
    top = $.pluck(0, top.sort($.comparing('1', -1))); // sorted overalls, serves as a replacement seed map

    // safe to recreate groups using a possibly smaller group size than the original requested
    // because it was determined during construction that the model needed reducing then!
    var grs = $.maximum($.pluck('length', $.pluck('p', nxtRnd)));
    var nextSeeded = G.groups(top.length, grs);

    // now loop through these and match each group up with the right match in nxtRnd
    for (var k = 0; k < nextSeeded.length; k += 1) {
      nxtRnd[k].p = []; // reset the player array in this match, will re-add in inner loop

      var match = nextSeeded[k];
      for (var j = 0; j < match.length; j += 1) {
        var seed = match[j];
        // nextSeeded is a group in G.groups so elements are seed numbers
        // map it to the corr. top position from last round and add to player array
        nxtRnd[k].p.push(top[seed - 1]);
      }
    }
  }
  return true;
};

var results = function (size, ms) {
  var res = [];
  for (var s = 0; s < size; s += 1) {
    res[s] = {
      seed : s + 1
    , sum : 0
    //, best : 0  // not clear what is best, need the system to come in here or reference instead
    , wins : 0
    , pos  : size // initialize to last place if no rounds played
    };
  }

  for (var i = 0; i < ms.length; i += 1) {
    var g = ms[i];
    if (!g.m) {
      continue; // only count played matches (WO markers don't exist in FFA)
    }

    var top = $.zip(g.p, g.m).sort($.comparing('1', -1));
    for (var j = 0; j < top.length; j += 1) {
      var pJ = top[j][0] - 1  // convert seed -> zero indexed player number
        , mJ = top[j][1];     // map wins for pJ

      // inc wins
      res[pJ].wins += top.length - j - 1; // ffa wins === number of player below
      res[pJ].sum += mJ;
    }
  }

  var rounds = [];
  ms.forEach(function (m) {
    if (!rounds[m.id.r - 1]) {
      rounds[m.id.r - 1] = [];
    }
    rounds[m.id.r - 1].push(m);
  });
  var maxround = rounds.length;

  // helpers for round loop
  var isReady = function (rnd) {
    return rnd.some(function (m) { // suffices to use .some since scoreFfa only propagates at end
      return m.p.some($.neq(T.NA));  // players exist => previous round is scored
    });
  };
  var getRndSize = function (rnd) {
    return $.sum(rnd.map(function (m) {
      return m.p.length;
    }));
  };

  // push top X from each round backwards from last round
  var posCtr = 1; // start with winner and go down
  var prevRoundSize = 0;
  for (var k = maxround; k > 0 ; k -= 1) { // round 1-indexed
    var rnd = rounds[k - 1];
    var roundSize = getRndSize(rnd);
    var resEl;

    if (k === maxround && rnd[0].m) {
      var gf = rnd[0];
      var winners = $.zip(gf.p, gf.m).sort($.comparing('1', -1));
      for (var w = 0; w < winners.length; w += 1) {
        resEl = res[winners[w][0] - 1]; // winners[w][0] gets a seed number then 0 index it
        resEl.pos = w + 1;
      }
    }
    else if (isReady(rnd)) {
      var rndPls = $.flatten($.pluck('p', rnd));
      // store round winners in order (the ones not stored already) the .pos in res[seed-1]
      for (var l = 0; l < rndPls.length; l += 1) {
        resEl = res[rndPls[l] - 1];
        if (k === maxround) {
          resEl.pos = rnd[0].p.length; // let final match tie at last place before scoring
        }
        else if (resEl.pos === size) {
          resEl.pos = posCtr;
        }
      }
    }
    posCtr += roundSize - prevRoundSize;
    prevRoundSize = roundSize;
  }
  return res.sort($.comparing('pos'));
};

var upcoming = function (ms, pId) {
  var relevants = ms.filter(function (g) {
    return g.p.indexOf(pId) >= 0;
  });

  if (!relevants) {
    return null; // player not in the tournament
  }

  // return from the match with pId inside the one with maximum round number
  var maxGame = $.maximumBy(function (x, y) {
    return x.id.r - y.id.r;
  }, relevants);

  if (!maxGame.m) {
    // not played yet, this is the one
    return maxGame.id;
  }
  // it has been played, if the player advances, it will be into this round:
  return {s: 1, r: maxGame.id.r + 1}; // partial info
};

// or FFA(numPlayers, matches)
function FFA(numPlayers, groupSize, advancers) {
  this.numPlayers = numPlayers;
  if (Array.isArray(groupSize)) {
    this.matches = groupSize;
  }
  else {
    this.matches = elimination(numPlayers, groupSize, advancers);
  }
}

FFA.fromJSON = function (matches) {
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new FFA(numPlayers, matches));
};

FFA.prototype.scorable = function (id) {
  return scorable(this.matches, id);
};

FFA.prototype.score = function (id, mapScore) {
  return score(this.matches, id, mapScore);
};

FFA.prototype.representation = representation;

FFA.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, playerId);
};

FFA.prototype.results = function () {
  return results(this.numPlayers, this.matches);
};

module.exports = FFA;
