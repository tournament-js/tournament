var log = require('logule').init(module)
  , $ = require('interlude')
  , T = require('./common')
  , G = require('./groups');

// ffa has no concepts of sections yet so they're all 1
var idString = function (id) {
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


var roundInvalidReason = function (np, grs, adv, isUnfilled) {
  // the group size in here refers to the maximal reduced group size
  if (np < 3) {
    return "needs at least 3 players";
  }
  if (grs < 3) {
    return "groups size must be at least 3";
  }
  if (grs >= np) {
    return "group size must be less than the number of players";
  }
  if (grs <= adv) {
    return "must advance less than the group size";
  }
  if (isUnfilled && grs - 1 <= adv) {
    return "must advance less than the smallest group size";
  }
  if (adv <= 0) {
    return "must eliminate players each match";
  }
  return null;
};

// for automatic mode
//var eliminationValid = function (np, grs, adv) {
//  return (roundInvalidReason(np, grs, adv) === null);
//};

var ffaInvalidReason = function (np, grs, adv) {
  var fails = [];
  if (!Array.isArray(grs)) {
    fails.push("grs must be an array of length numRounds");
  }
  else if (!Array.isArray(adv)) {
    fails.push("adv must be an array of length numRounds-1");
  }
  else if (grs.length !== adv.length + 1) {
    fails.push("grs length must equal adv length + 1");
  }
  else {
    for (var i = 0; i < adv.length; i += 1) {
      var a = adv[i]; // TODO: not always present
      var g = grs[i];
      // calculate how big the groups are
      var numGroups = Math.ceil(np / g);
      var gActual = G.reduceGroupSize(np, g, numGroups);

      if (numGroups <= 1) {
        // last round needs less rigorous testing
        break;
      }
      // and ensure with group reduction that eliminationValid for reduced params
      var invReason = roundInvalidReason(np, gActual, a, np % numGroups);
      if (invReason !== null) {
        fails.push("round " + i + ":" + invReason);
        break;
      }
      // return how many players left so that np is updated for next itr
      np = numGroups*a; // TODO: a not always there
    }
    if (np < 2) {
      fails.push("FFA configuration leaves less than two players in the final");
    }
  }
  return (fails.length > 0) ? fails[0] : null;
};

//var ffaValid = function (np, grs, adv) {
//  return (ffaInvalidReason(np, grs, adv) === null);
//};

var elimination = function (np, grs, adv) {
  var invReason = ffaInvalidReason(np, grs, adv);
  if (invReason !== null) {
    log.error("Invalid FFA configuration %dp sizes=%j, advs=%j", np, grs, adv);
    log.error("reason: %s", invReason);
    return {};
  }
  var matches = []; // pushed in sort order
  log.trace('creating %dp FFA elimination (%j/%j advancing)', np, adv, grs);

  // rounds created iteratively - know configuration valid at this point so just
  // repeat the calculation in the validation
  for (var i = 0; i < grs.length; i += 1) {
    var a = adv[i];
    var gs = grs[i];

    var numGroups = Math.ceil(np / gs);
    var gsActual = G.reduceGroupSize(np, gs, numGroups);

    // irrelevant which gs we use as G.groups reduces anyway
    // though might as well save it the effort and we need it here anyway
    var grps = G.groups(np, gsActual);
    if (numGroups !== grps.length) {
      throw new Error("internal FFA construction error");
    }
    if (i > 0) {
      // only fill in players for round 1, otherwise placeholders
      grps = unspecify(grps);
    }

    // fill in matches
    for (var m = 0; m < grps.length; m += 1) {
      matches.push({id: {s: 1, r: i+1, m: m + 1}, p: grps[m]}); // matches 1-indexed
    }

    // reduce players left
    np = numGroups*a;
  }
  return matches;
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
  else if (adv > 0 && score[adv] === score[adv - 1]) {
    // 0. b) ensure scores are sufficiently unambiguous in who won
    // NB: Rule bypassed in grand final because TODO: overrule just less
    log.error("scores must unambiguous decide who is in the top", adv);
  }
  else {
    passed = true;
  }

  if (!passed) {
    log.error("failed scoring %s with %j", idString(id), score);
    return false;
  }

  // 1. score match
  m.m = score; // only map scores are relevant for progression

  // prepare next round iff all matches in current round were scored
  var currRnd = ms.filter(function (m) {
    return m.id.r === id.r;
  });
  var rndScored = currRnd.every($.get('m'));
  if (rndScored && adv > 0) {
    var nxtRnd = ms.filter(function (m) {
      return (m.id.r === id.r + 1);
    });

    var top = currRnd.map(function (m) {
      return $.zip(m.p, m.m).sort(T.compareZip).slice(0, adv);
    });

    // now flatten and sort across matches
    // this essentially re-seeds players for the next round
    top = $.pluck(0, $.flatten(top).sort(T.compareZip));

    // re-find group size from maximum length of zeroed player array in next round
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
      var top = $.zip(g.p, g.m).sort(T.compareZip);
      for (var j = 0; j < top.length; j += 1) {
        var pJ = top[j][0] - 1  // convert seed -> zero indexed player number
          , mJ = top[j][1];     // map wins for pJ

        var adv = advs[g.id.r - 1] || 0;
        // NB: final round win counted in T.positionTies as can have multiple winners
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

  rounds.forEach(function (rnd, k) {
    var adv = advs[k] || 0; // so we can do last round
    var rndPs = $.flatten($.pluck('p', rnd));

    if (isDone(rnd)) {
      // if round is done, position the ones not advancing from that round
      // collect and sort between round the ones after top adv
      // NB: because of adv zero in final, everyone's treated as a loser here
      var topNonAdvs = rnd.map(function (m) {
        return $.zip(m.p, m.m).sort(T.compareZip).slice(adv); // bottom 'half'
      });

      var nonAdvs = $.flatten(topNonAdvs).sort(T.compareZip);
      T.positionTies(res, nonAdvs, rndPs.length - nonAdvs.length);
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
  var advanced = $.zip(match.p, match.m).sort(T.compareZip).some(function (ps, k) {
    return (k <= adv[maxr - 1] && ps[0] === pId); // must be among the top adv[r]
  });

  if (advanced) {
    return {s: 1, r: match.id.r + 1};
  }
};

// interface
function FFA(numPlayers, grs, advs, matches) {
  this.numPlayers = numPlayers;
  this.adv = advs;
  this.matches = matches || elimination(numPlayers, grs, advs);
}

FFA.fromJSON = function (matches) {
  if (!matches.length) {
    log.error("no matches - cannot recreate ffa tournament from: \n", matches);
    return;
  }
  // re-calculate props by inspecting the matches
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
  return (new FFA(numPlayers, [], adv, matches));
};

FFA.idString = idString;

FFA.prototype.scorable = function (id) {
  return scorable(this.matches, id);
};

FFA.prototype.score = function (id, mapScore) {
  // advancers array should only perform the check in the non-final round
  // thus if id.r === final round, we pass in 0 to  bypass
  return score(this.matches, this.adv[id.r - 1] || 0, id, mapScore);
};

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
