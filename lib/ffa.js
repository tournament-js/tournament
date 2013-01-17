var $ = require('interlude')
  , T = require('./common')
  , algs = require('./balancer');

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


var roundInvalid = function (np, grs, adv, numGroups) {
  // the group size in here refers to the maximal reduced group size
  if (Math.ceil(grs) !== grs || Math.ceil(adv) !== adv) {
    return "individual group size and adv must all be integers";
  }
  if (Math.ceil(np) !== np || np < 2) {
    return "needs at least 2 players";
  }
  if (grs < 3 || (numGroups === 1 && grs >= 2)) {
    return "groups size must be at least 3 in regular rounds - 2 in final";
  }
  if (grs >= np) {
    return "group size must be less than the number of players left";
  }
  if (adv >= grs) {
    return "must advance less than the group size";
  }
  var isUnfilled = (np % numGroups) > 0;
  if (isUnfilled && adv >= grs - 1) {
    return "must advance less than the smallest group size";
  }
  if (adv <= 0) {
    return "must eliminate players each match";
  }
  return null;
};

var finalInvalid = function (leftOver, limit, gLast) {
  if (leftOver < 2) {
    return "must at least contain 2 players"; // force >4 when using limits
  }
  var lastNg = Math.ceil(leftOver / gLast);
  if (limit > 0) { // using limits
    if (limit >= leftOver) {
      return "limit must be less than the remaining number of players";
    }
    // need limit to be a multiple of numGroups (otherwise tiebreaks necessary)
    if (limit % lastNg !== 0) {
      return "number of groups must divide limit";
    }
  }
  else if (lastNg !== 1) {
    return "must contain a single match when not using limits";
  }
  return null;
};

var invalid = function (np, grs, adv, opts) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np || np < 2) {
    return "number of players must be at least 2";
  }
  if (!Array.isArray(grs) || !Array.isArray(adv)) {
    return "adv and grs must be arrays";
  }
  if (!grs.length || !grs.every(Number.isFinite)) {
    return "grs must be a non-empty array of integers";
  }
  if (!adv.every(Number.isFinite) || grs.length !== adv.length + 1) {
    return "adv must be an array of integers of length grs.length - 1";
  }

  var numGroups = 0;
  for (var i = 0; i < adv.length; i += 1) {
    // loop over adv as then both a and g exist
    var a = adv[i];
    var g = grs[i];
    // calculate how big the groups are
    numGroups = Math.ceil(np / g);
    var gActual = algs.reduceGroupSize(np, g, numGroups);

    // and ensure with group reduction that eliminationValid for reduced params
    var invReason = roundInvalid(np, gActual, a, numGroups);
    if (invReason !== null) {
      return "round " + (i+1) + " " + invReason;
    }
    // return how many players left so that np is updated for next itr
    np = numGroups*a;
  }
  // last round and limit checks
  var invFinReason = finalInvalid(np, (opts && opts.limit) | 0, grs[grs.length-1]);
  if (invFinReason !== null) {
    return "final round: " + invFinReason;
  }

  // nothing found - ok to create
  return null;
};

var elimination = function (np, grs, adv, limit) {
  var invReason = invalid(np, grs, adv, {limit: limit});
  if (invReason !== null) {
    console.error("Invalid FFA configuration %dp sizes=%j, advs=%j, opts=%j"
      , np, grs, adv, {limit: limit});
    console.error("reason: %s", invReason);
    return {};
  }
  //console.log('creating %dp FFA elimination (%j/%j advancing)', np, adv, grs);

  var matches = []; // pushed in sort order
  // rounds created iteratively - know configuration valid at this point so just
  // repeat the calculation in the validation
  for (var i = 0; i < grs.length; i += 1) {
    var a = adv[i]
      , gs = grs[i]
      , numGroups = Math.ceil(np / gs)
      , gsActual = algs.reduceGroupSize(np, gs, numGroups);

    // irrelevant which gs we use as algs.groups reduces anyway
    // though might as well save it the effort and we need it here anyway
    var grps = algs.groups(np, gsActual);
    if (numGroups !== grps.length) {
       throw new Error("internal FFA construction error");
    }
    if (i > 0) {
      // only fill in seeding numbers for round 1, otherwise placeholders
      grps = unspecify(grps);
    }

    // fill in matches
    for (var m = 0; m < grps.length; m += 1) {
      matches.push({id: {s: 1, r: i+1, m: m + 1}, p: grps[m]}); // matches 1-indexed
    }
    // reduce players left (for next round - which will exist if a is defined)
    np = numGroups*a;
  }
  return matches;
};

var unscorable = function (ms, adv, limit, id, score, allowPast) {
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
  if (adv > 0 && score[adv] === score[adv - 1]) {
    return "scores must unambiguous decide who advances";
  }
  if (!adv && limit > 0) {
    // number of groups in last round is the match number of the very last match
    // because of the ordering this always works!
    var lastNG = ms[ms.length-1].id.m;
    var cutoff = limit/lastNG; // NB: lastNG divides limit (from finalInvalid)
    if (score[cutoff] === score[cutoff - 1]) {
      return "scores must decide who advances in final round with limits";
    }
  }
  if (!allowPast && Array.isArray(m.m)) {
    return "cannot re-score match";
  }
  return null;
};

// updates ms in place and returns whether or not anything changed
var score = function (ms, adv, id, score, limit) {
  // 0. error handling - if this fails client didnt guard so we log
  var invReason = unscorable(ms, adv, limit, id, score, true);
  if (invReason !== null) {
    console.error("failed scoring FFA match %s with %j", idString(id), score);
    console.error("reason:", invReason);
    return false;
  }
  //console.log("scoring FFA %s with %j", idString(id), score);

  // 1. score match
  var m = T.findMatch(ms, id);
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
    algs.groups(top.length, grs).forEach(function (group, k) {
      // replaced nulled out player array with seeds mapped to corr. top placers
      nxtRnd[k].p = group.map(function (seed) {
        return top[seed-1]; // NB: top is zero indexed
      });
    });
  }
  return true;
};


// helpers for results' round loop
var isReady = function (rnd) {
  return rnd.some(function (m) {
    return m.p.some($.neq(T.NA));
  });
};
var isDone = function (rnd) {
  return rnd.every($.get('m'));
};

var results = function (size, ms, advs, limit) {
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
        // NB: final round win counted by T.positionTies as can have multiple winners
        if (j < adv) {
          res[pJ].wins += 1;
        }
        res[pJ].sum += mJ;
      }
    }
  }

  var rounds = $.replicate(maxround, []);
  ms.forEach(function (m) {
    rounds[m.id.r - 1].push(m);
  });

  // gradually improve scores for each player by looking at later and later rounds
  rounds.forEach(function (rnd, k) {
    var adv = advs[k] || 0; // so we can do last round
    var rndPs = $.flatten($.pluck('p', rnd));

    if (isDone(rnd)) {
      if (limit > 0 && k === maxround - 1) {
        // this is the special case of a `limit`ed tournament
        // it may not be a 'final' in the sense that rnd.length >= 1
        // as the winnners goto a new tournament and losers are knocked out

        if (rndPs.length < limit) {
          // sanity check for own tests
          throw new Error("FFA internal error - too few players for forwarding");
        }
        // figure out how many to advance from each round
        // we know limit is a multiple of rnd.length
        if (limit % rnd.length !== 0) {
          throw new Error("FFA internal error - limit not multiple of maxrnd len");
        }
        adv = limit / rnd.length;

        // losers fall through and are scored as any other done round with 'adv' set
        // but we must positions winners as well (top adv each match) in this rnd
        // as nothing else does this in this special case
        rnd.forEach(function (m) {
           var winners = $.zip(m.p, m.m).sort(T.compareZip).slice(0, adv);

           winners.forEach(function (w, i) {
             var resEl = res[w[0] - 1];
             // no adv set for this round so must also increment wins for these
             resEl.wins += 1;
             // their final position shall be tied between groups, and desc within
             resEl.pos = i*rnd.length + 1;
           });
        });
      }
      // if round is done, position the ones not advancing from that round
      // collect and sort between round the ones after top adv
      // NB: in `limit`-less final, adv is zero, so everyone's treated as a loser
      rnd.forEach(function (m) {
        // start at: numPlayers - (numPlayers - adv*numGroups) + 1
        var start = rndPs.length - (rndPs.length - adv*rnd.length) + 1;

        var losers = $.zip(m.p, m.m).sort(T.compareZip).slice(adv); // bottom 'half'
        losers.forEach(function (l, i) {
          var resEl = res[l[0] - 1];
          if (i === 0 && adv === 0) {
            // set wins +1 on actual winner in `limit`-less final
            resEl.wins += 1;
          }
          // tie x-placing losers between groups (at least pos-wise)
          resEl.pos = start + i*rnd.length;
        });
      });
    }
    else if (isReady(rnd)) {
      // round is simply ready, make sure everyone who got here is tied
      rndPs.forEach(function (p) {
        // last place in round is simply number of players beneath
        res[p-1].pos = rndPs.length;
      });
    }
  });
  // still sort also by sum in case people want to use that
  return res.sort($.comparing('pos', +1, 'sum', -1));
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
function FFA(numPlayers, grs, advs, opts, matches) {
  this.numPlayers = numPlayers;
  this.adv = advs;

  this.limit = 0;
  if (opts) {
    this.limit = opts.limit | 0;
  }
  this.matches = matches || elimination(numPlayers, grs, advs, this.limit);
}

FFA.fromJSON = function (matches, opts) {
  if (!matches.length) {
    console.error("no matches - cannot recreate ffa tournament from: \n", matches);
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
  return (new FFA(numPlayers, [], adv, opts || {}, matches));
};

FFA.invalid = invalid;
FFA.idString = idString;

FFA.prototype.unscorable = function (id, mapScore, past) {
  return unscorable(
    this.matches,
    this.adv[id.r - 1] || 0,
    this.limit, id,
    mapScore,
    past
  );
};

FFA.prototype.score = function (id, mapScore) {
  // advancers array should only perform the check in the non-final round
  // thus if id.r === final round, we pass in 0 to  bypass
  return score(this.matches, this.adv[id.r - 1] || 0, id, mapScore, this.limit);
};

FFA.prototype.isDone = function () {
  return this.matches.every($.get('m'));
};

FFA.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, this.adv, playerId);
};

FFA.prototype.results = function () {
  return results(this.numPlayers, this.matches, this.adv, this.limit);
};

module.exports = FFA;
