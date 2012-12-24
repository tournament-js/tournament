var log = require('logule').init(module)
  , T = require('./common')
  , $ = require('interlude');

// ko tournaments is one match per round only
var idString = function (id) {
  return "R" + id.r;
};

var invalid = function (np, kos) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np || np < 3) {
    return "KnockOut must contain at least 3 players";
  }
  if (!Array.isArray(kos)) {
    return "kos must be an array of integers";
  }
  for (var i = 0; i < kos.length; i += 1) {
    var ko = kos[i];
    if (!Number.isFinite(ko) || Math.ceil(ko) !== ko) {
      return "kos must be an array of integers";
    }
    if (ko < 1) {
      return "must knock out players each round";
    }
    if (np - ko <= 1) {
      return "cannot leave one or less players in a match";
    }
    np -= ko;
  }
  return null;
};

// requires only num players and array of knockout values for each round
var knockout = function (np, kos) {
  var invReason = invalid(np, kos);
  if (invReason !== null) {
    log.error("Invalid KnockOut configuration %dp kos=%j", np, kos);
    log.error("reason: %s", invReason);
    return [];
  }

  var ms = [];
  ms.push({id: {s:1, r:1, m:1}, p: $.range(np)});
  for (var i = 0; i < kos.length; i += 1) {
    // create the next round from current ko parameter
    np -= kos[i];
    ms.push({id: {s:1, r:i+2, m:1}, p: $.replicate(np, T.NA)});
  }
  return ms;
};

var unscorable = function (ms, ko, id, score, allowPast) {
  var m = T.findMatch(ms, id);
  if (!m) {
    return "match id was not found in tournament";
  }
  if (m.p.some($.eq(T.NA))) {
    return "cannot score unprepared match with no players in it";
  }
  if (!Array.isArray(score) || score.length !== m.p.length)  {
    return "need the same amount of scores as players:" + m.p.length;
  }
  if (!score.every(Number.isFinite)) {
    return "scores array must be numeric";
  }
  var adv = m.p.length - ko;
  if (ko > 0 && score[adv-1] === score[adv]) {
    return "scores must unambiguous decide who is in the top " + adv;
  }
  if (!allowPast && Array.isArray(m.m)) {
    return "cannot re-score match";
  }
  return null;
};

var score = function (ms, ko, id, score) {
  // 0. error handling - if this fails client didnt guard so we log
  var invReason = unscorable(ms, ko, id, score, true);
  if (invReason !== null) {
    log.error("failed scoring knockout %s with %j", idString(id), score);
    log.error("reason:", invReason);
    return false;
  }
  log.trace("scoring KnockOut %s with %j", idString(id), score);

  // 1. score match
  var m = T.findMatch(ms, id);
  m.m = score;

  // was it the final?
  if (!ko) {
    return true;
  }
  // 2. progress the top not knocked out
  var adv = m.p.length - ko;
  var top = $.zip(m.p, m.m).sort(T.compareZip).slice(0, adv);
  var nextM = T.findMatch(ms, {s: 1, r: m.id.r+1, m:1});

  if (!nextM) {
    throw new Error("next match not found in knockout match list");
  }
  if (top.length !== adv) {
    throw new Error("match corrup - less players than expected in " + idString(id));
  }

  // progress
  nextM.p = $.pluck('0', top);

  return true;
};

// helper for results
var positionTies = function (res, sortedPairSlice, startPos) {
  // when we only score a subset start positioning at the beginning of slice
  var pos = startPos
    , ties = 0
    , scr = -Infinity;

  // loop over players in order of their score
  for (var k = 0; k < sortedPairSlice.length; k += 1) {
    var pair = sortedPairSlice[k]
      , p = pair[0] - 1
      , s = pair[1];

    // if this is a tie, pos is previous one, and next real pos must be incremented
    if (scr === s) {
      ties += 1;
    }
    else {
      pos += 1 + ties; // if we tied, must also + that
      ties = 0;
    }
    res[p].pos = pos;
    scr = s;

    // grand final winner have to be computed outside normal progression check
    // so do it in here if we just moved the guy to position 1
    // this function is only called once on each set - and tested heavily anyway
    if (res[p].pos === 1) {
      res[p].wins += 1;
    }
  }
};

var results = function (ms, kos) {
  var res = [];
  for (var s = 0; s < ms[0].p.length; s += 1) {
    res[s] = {
      seed : s + 1,
      sum  : 0,
      wins : 0,
      pos  : ms[0].length
    };
  }

  // iterative ko results involve: assume previous match have filled in results:
  // then scan new match m:
  // if not played, all tie at m.p.length, else:
  // - losers should have pos === their last round scores, so current pos
  // - winners will get their scores calculated in the next round (unless final)
  // - winners get complete final calculation if final
  // - can leave all other player alone as they were covered in earlier iterations

  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (!m.m) {
      // no score, tie all players in this match at m.p.length
      for (var j = 0; j < m.p.length; j += 1) {
        var idx = m.p[j] - 1;
        res[idx].pos = m.p.length;
      }
      break; // last scored match, no more to do
    }
    var adv = m.p.length - (kos[i] || 0);
    var top = $.zip(m.p, m.m).sort(T.compareZip);

    // update score sum and wins (won if proceeded)
    for (var k = 0; k < top.length; k += 1) {
      var p = top[k][0] - 1;
      var sc = top[k][1];
      res[p].sum += sc;
      if (i < ms.length - 1 && k < adv) {
        res[p].wins += 1;
      }
    }

    if (kos[i]) { // set positions (allow ties) for losers
      positionTies(res, top.slice(-kos[i]), top.length - kos[i]);
      // next match will set the remaining players if unscored
      // if scored one more round of updating losers
    }

    if (!kos[i]) {
      // update all players in final (allow ties)
      positionTies(res, top, 0);
      break; // no more matches after final
    }
  }
  return res.sort(T.compareRes);
};

var upcoming = function (ms, kos, pId) {
  var firstUnscored = $.firstBy($.not($.get('m')), ms);
  if (!firstUnscored) {
    return; // tournament over
  }
  // player advanced to this round iff he is in this match
  // this match is by construction unscored so play this
  if (firstUnscored.p.indexOf(pId) >= 0) {
    return firstUnscored.id;
  }
};


// interface
function KnockOut(numPlayers, koArray, matches) {
  this.kos = koArray;
  this.numPlayers = numPlayers; // for consistency (unsused across member fns)
  this.matches = matches || knockout(numPlayers, koArray);
}

KnockOut.fromJSON = function (matches) {
  if (!matches.length || !matches[0].p.length) {
    log.error("cannot recreate knockout tournament from \n", matches);
  }
  var kos = [];
  var previous = matches[0].p.length;
  for (var i = 1; i < matches.length; i += 1) {
    var m = matches[i];
    kos.push(previous - m.p.length);
    previous = m.p.length;
  }
  return new KnockOut(matches[0].p.length, kos, matches);
};

KnockOut.idString = idString;
KnockOut.invalid = invalid;

KnockOut.prototype.unscorable = function (id, mapScore, past) {
  return unscorable(this.matches, this.kos[id.r - 1] || 0, id, mapScore, past);
};

KnockOut.prototype.score = function (id, mapScore) {
  return score(this.matches, this.kos[id.r - 1] || 0, id, mapScore);
};

KnockOut.prototype.results = function () {
  return results(this.matches, this.kos);
};

KnockOut.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, this.ko, playerId);
};

KnockOut.prototype.isDone = function () {
  return Array.isArray($.last(this.matches).m);
};


module.exports = KnockOut;
