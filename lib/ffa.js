var log = require('logule').init(module)
  , $ = require('interlude')
  , T = require('./common')
  , G = require('./groups');

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

// how a zipped players array and match score array is sorted
var comparePtsSeed = $.comparing('1', -1, '0', +1);

var elimination = function (np, grs, adv) {
  if (np <= 2 || grs <= 2 || np <= grs || adv >= grs || adv <= 0) {
    log.error("invalid FFA configuration: %dp (%d/%d advancing)", np, adv, grs);
    return [[], []]; // o_o
  }
  var matches = []
    , advUsed = []
    , grps = G.groups(np, grs);

  log.trace('creating %dp FFA elimination (%d/%d advancing)', np, adv, grs);

  // metric to determine the best adv for the next groups call uses 3 factors:
    // - distance from requested adv (important)
    // - how close the groups are to filled (where +2 off equally bad as -2 off)
    // - how close the implied group size is from the requested if changing adv

  // make a new cost function each round based on round parameters
  var cost = function (minsize, prevNumGroups) {
    // compares against the closed over grs, adv
    return function (adv2) {
      var advCloseness = Math.abs(adv - adv2)
        , tot = prevNumGroups * adv2   // total players in next group if using adv2
        , numGroups = Math.ceil(tot / grs)
        , grs2 = G.reduceGroupSize(tot, grs, numGroups)
        , grpFillCloseness = Math.min(Math.abs((tot % grs2) - grs2), tot % grs2)
        , grpCloseness = grs - grs2; // grs >= grs2

      var cost = 2*advCloseness + 1*grpCloseness + 2*grpFillCloseness;
      //log.info('cost of ', adv2, 'is', cost);
      return cost;
    };
  };

  // create each round iteratively
  for (var r = 1; grps.length > 1; r += 1) {
    for (var i = 0; i < grps.length; i += 1) {
      matches.push({id: {s: 1, r: r, m: i + 1}, p: grps[i]}); // matches 1-indexed
    }

    // G.groups may adjust grs internally, so we find the smallest
    var minsize = $.minimum($.pluck('length', grps));

    // we adjust adv for next round if the players fill too few spaces
    // NB: changing the group size would technically be possible in some cases

    // the adv optimization ia a fuzzy science, but has been tested rigorously

    // every match must eliminate something => force < minsize
    var advCands = $.range(adv).filter($.lt(minsize));
    // a worst case candidate to ensure non-emptiness
    var guess = Math.max(1, adv - (grs - minsize));
    if (advCands.indexOf(guess) < 0) {
      advCands.unshift();
    }

    var bestA = $.minimumBy($.compare(cost(minsize, grps.length)), advCands);
    if (bestA < adv) {
      log.trace('will only advance %s from each match in round %d', bestA, r);
    }
    advUsed.push(bestA);
    grps = unspecify(G.groups(grps.length * bestA, grs));
  }
  matches.push({id: {s: 1, r: r, m: 1}, p: grps[0]}); // grand final
  return [advUsed, matches]; // NB: matches pushed in sort order
};

var scorable = function (ms, id) {
  var m = $.firstBy(T.byId.bind(null, id), ms);
  // match exists, ready to be scored, and not already scored
  return (m && m.p && m.p.every($.neq(T.NA)) && !m.m);
};

// updates ms in place and returns whether or not anything changed
var score = function (ms, adv, id, score) {
  // 0. a) basic sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms);
  var passed = false;

  if (!m) {
    log.error("match id was not found in tournament");
  }
  else if (m.p.some($.eq(T.NA))) {
    log.error("cannot score unprepared match with no players in it");
  }
  else if (!Array.isArray(score) || score.length !== m.p.length)  {
    log.error("scores must be an array of length === m.p");
  }
  else if (!score.every(Number.isFinite)) {
    log.error("scores array must be numeric");
  }
  else if (adv !== -1 && score[adv] === score[adv - 1]) {
    // 0. b) ensure scores are sufficiently unambiguous in who won
    // NB: Rule bypassed in grand final because TODO: overrule just less
    log.error("scores must unambiguous decide who is in the top", adv);
  }
  else {
    passed = true;
  }

  if (!passed) {
    log.error("failed scoring %s with %j", representation(id), score);
    return false;
  }

  // 1. score match
  m.m = score; // only map scores are relevant for progression

  // prepare next round iff all matches in current round were scored
  var currRnd = ms.filter(function (m) {
    return m.id.r === id.r;
  });
  var rndScored = currRnd.every($.get('m'));
  if (rndScored) {
    var nxtRnd = ms.filter(function (m) {
      return (m.id.r === id.r + 1);
    });

    var top = currRnd.map(function (m) {
      return $.zip(m.p, m.m).sort(comparePtsSeed).slice(0, adv);
    });

    // now flatten and sort across matches
    // this essentially re-seeds players for the next round
    top = $.pluck(0, $.flatten(top).sort(comparePtsSeed));

    // re-find group size from maximum number of zeroed player array in next round
    var grs = $.maximum($.pluck('length', $.pluck('p', nxtRnd)));

    // set all next round players with the fairly grouped set
    G.groups(top.length, grs).forEach(function (group, k) {
      // replaced nulled out player array with seeds mapped to corr. top placers
      nxtRnd[k].p = group.map(function (seed) {
        return top[seed-1]; // NB: top is zero indexed
      });
    });
  }
  return true;
};

var results = function (size, ms, advs) {
  var res = [];
  for (var s = 0; s < size; s += 1) {
    // TODO: best scores per player?
    res[s] = {
      seed : s + 1,
      sum  : 0,
      wins : 0,
      pos  : size // initialize to last place if no rounds played
    };
  }

  var maxround = 1;
  for (var i = 0; i < ms.length; i += 1) {
    var g = ms[i];
    maxround = Math.max(g.id.r, maxround);

    if (g.m) {
      // count stats for played matches
      var top = $.zip(g.p, g.m).sort(comparePtsSeed);
      for (var j = 0; j < top.length; j += 1) {
        var pJ = top[j][0] - 1  // convert seed -> zero indexed player number
          , mJ = top[j][1];     // map wins for pJ

        var adv = advs[g.id.r - 1] || 0; //  final round win counted elsewhere
        if (j < adv) {
          res[pJ].wins += 1;
        }
        res[pJ].sum += mJ;
      }
    }
  }

  // helpers for round loop
  var isReady = function (rnd) {
    return rnd.some(function (m) {
      return m.p.some($.neq(T.NA));
    });
  };

  var isDone = function (rnd) {
    return rnd.every($.get('m'));
  };

  var rounds = $.replicate(maxround, []);
  ms.forEach(function (m) {
    rounds[m.id.r - 1].push(m);
  });

  // similar to knockout position function to handle ties, perhaps refactor
  var position = function (sortedPairs, start) {
    var currentTies = 0;
    // when we only score a subset start positioning at the beginning of slice
    var currentPos = start;
    var currentScore = -Infinity;

    // loop over players in order of their score
    for (var k = 0; k < sortedPairs.length; k += 1) {
      var pair = sortedPairs[k];
      var p = pair[0] - 1;
      var s = pair[1];

      // if this is a tie, pos is previous one, but keep track of num ties per pos
      if (Number.isFinite(currentScore) && Math.max(currentScore, s) === s) {
        currentTies += 1;
        res[p].pos = currentPos;
      }
      else {
        currentPos += 1;
        // move over tie count from earlier iterations
        currentPos += currentTies;
        currentTies = 0;
        res[p].pos = currentPos;
      }
      currentScore = s;
      if (res[p].pos === 1) {
        res[p].wins += 1; // final victory has to be counted somewhere
      }
    }
  };

  rounds.forEach(function (rnd, k) {
    var adv = advs[k] || 0; // so we can do last round
    var rndPs = $.flatten($.pluck('p', rnd));

    if (isDone(rnd)) {
      // if round is done, position the ones not advancing from that round
      // collect and sort between round the ones after top adv
      var topNonAdvs = rnd.map(function (m) {
        return $.zip(m.p, m.m).sort(comparePtsSeed).slice(adv); // bottom 'half'
      });

      var nonAdvs = $.flatten(topNonAdvs).sort(comparePtsSeed);
      position(nonAdvs, rndPs.length - nonAdvs.length);
    }
    else if (isReady(rnd)) {
      // else if it's simply ready, make sure everyone who got here is tied
      rndPs.forEach(function (p) {
        // last place in round is simply number of players beneath
        res[p-1].pos = rndPs.length;
      });
    }
  });
  return res.sort($.comparing('pos'));
};

var upcoming = function (ms, adv, pId) {
  var firstUnscored = $.firstBy($.not($.get('m')), ms);

  if (!firstUnscored) {
    return; // tournament over
  }

  var maxr = firstUnscored.id.r;
  var rnd = ms.filter(function (m) {
    return m.id.r === maxr;
  });

  // all players should be filled in at this point
  // otherwise firstUnscored would be in (maxr-1) ↯
  var match = $.firstBy(function (m) {
    return m.p.indexOf(pId) >= 0;
  }, rnd);

  if (!match) {
    return; // player did not reach this round
  }

  if (!match.m) {
    return match.id; // match not played => play this
  }

  // match played - will he advance?
  var advanced = $.zip(match.p, match.m).sort(comparePtsSeed).some(function (ps, k) {
    return (k <= adv[maxr - 1] && ps[0] === pId); // must be among the top adv[]
  });

  if (advanced) {
    return {s: 1, r: match.id.r + 1};
  }
};

// interface
function FFA(numPlayers, matchSize, advancers, matches) {
  this.numPlayers = numPlayers;
  if (matches && Array.isArray(advancers)) {
    // fromJSON calls new FFA(numPlayers, matches)
    this.matches = matches;
    this.adv = advancers; // advancers is now the array from fromJSON
  }
  else {
    var elimRes = elimination(numPlayers, matchSize, advancers);
    this.matches = elimRes[1];
    this.adv = elimRes[0];
  }
}

FFA.fromJSON = function (matches) {
  if (!matches.length) {
    log.error("no matches - cannot recreate ffa tournament from: \n", matches);
    return;
  }
  // re-calculate props by inspecting the matches
  // possibly even allows resizing later if i'm smart about it..
  var numRounds = $.maximum(matches.map($.get('id', 'r')))
    , playerLens = $.replicate(numRounds, 0)  // num players per round arrays
    , roundLens = $.replicate(numRounds, 0)   // num matches per round arrays
    , numPlayers = 0;

  matches.forEach(function (g) {
    var idx = g.id.r - 1;
    numPlayers = $.maximum(g.p.concat(numPlayers));
    playerLens[idx] += g.p.length;
    roundLens[idx] += 1;
  });
  var adv = $.range(numRounds-1).map(function (j) {
    return playerLens[j] / roundLens[j - 1];
  });

  return (new FFA(numPlayers, 0, adv, matches));
};

FFA.prototype.scorable = function (id) {
  return scorable(this.matches, id);
};

FFA.prototype.score = function (id, mapScore) {
  // advancers array should only perform the check in the non-final round
  // thus if id.r === final round, we pass in -1 to  bypass
  return score(this.matches, this.adv[id.r - 1] || -1, id, mapScore);
};

FFA.prototype.representation = representation;

FFA.prototype.isDone = function () {
  var gf = this.matches[this.matches.length-1];
  return Array.isArray(gf.m); // always done if last match scored
};

FFA.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, this.adv, playerId);
};

FFA.prototype.results = function () {
  return results(this.numPlayers, this.matches, this.adv);
};

module.exports = FFA;
