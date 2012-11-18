var log = require('logule').init(module)
  , T = require('./common')
  , $ = require('interlude');

// ko tournaments is one match per round only
var rep = function (id) {
  return "R" + id.r;
};

// how a zipped players array and match score array is sorted
var comparePtsSeed = $.comparing('1', -1, '0', +1);

// requires only num players and array of knockout values for each round
var knockout = function (np, kos) {
  var matches = [];
  matches.push({id: {s:1, r:1, m:1}, p: $.range(np)});
  for (var i = 0; i < kos.length; i += 1) {
    var ko = kos[i];
    if (!Number.isFinite(ko) || !ko) {
      log.error("cannot knockout zero players in round %d", i+1);
      return [];
    }
    // how many previous - ko is in next
    var leftover = matches[matches.length-1].p.length - ko;
    if (leftover <= 1) {
      log.error("cannot leave one player or less players in the final");
      return [];
    }
    matches.push({id: {s:1, r:i+2, m:1}, p: $.replicate(leftover, T.NA)});
  }
  // when kos is empty we assume it's the final
  return matches;
};

var score = function (ms, ko, id, score) {
  // 0. a) basic sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms);
  var adv = m ? m.p.length - ko : 0;
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
  else if (ko > 0 && score[adv-1] === score[adv]) {
    // 0. b) ensure scores are sufficiently unambiguous in who won
    log.error("scores must unambiguous decide who is in the top %s", adv);
  }
  else {
    passed = true;
  }

  if (!passed) {
    log.error("failed scoring knockout %s with %j", rep(id), score);
    return false;
  }

  // 1. score match
  m.m = score;

  // was it the final?
  if (!ko) {
    return true;
  }
  // 2. progress the top m.p.length - ko
  var top = $.zip(m.p, m.m).sort(comparePtsSeed).slice(0, adv);
  var nextM = $.firstBy(T.byId.bind(null, {s: 1, r: m.id.r+1, m:1}), ms);

  if (!nextM) {
    throw new Error("next match not found in knockout match list");
  }
  if (top.length !== adv) {
    throw new Error("match list corrupt - less players than expected in " + rep(id));
  }

  // progress
  nextM.p = $.pluck('0', top);

  return true;
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

  // figures out position from positions from a slice of the top sorted pairs
  // pass in top, start pos of where to slice it from
  var position = function (sortedPairs, start) {
    var currentTies = 0;
    // when we only score a subset start positioning at the beginning of slice
    var currentPos = start;
    var currentScore = -Infinity;
    // loop over players in order of their score
    for (var k = start; k < sortedPairs.length; k += 1) {
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
        var p = m.p[j] - 1;
        res[p].pos = m.p.length;
      }
      break; // last scored match, no more to do
    }
    var adv = m.p.length - (kos[i] || 0);
    var top = $.zip(m.p, m.m).sort(comparePtsSeed);

    // update score sum and wins (won if proceeded)
    for (var k = 0; k < top.length; k += 1) {
      var p = top[k][0] - 1;
      var s = top[k][1];
      res[p].sum += s;
      if (i < ms.length - 1 && k < adv) {
        res[p].wins += 1;
      }
    }

    if (kos[i]) { // set positions for losers
      position(top, top.length - kos[i]);
      // next match will set the remaining players if unscored
      // if scored one more round of updating losers
    }

    if (!kos[i]) {
      // update all players in final
      position(top, 0);
      break; // no more matches after final
    }
  }
  return res.sort($.comparing('pos'));
};

var upcoming = function (ms, kos, pId) {
  var firstUnscored = $.firstBy($.not($.get('m')), ms);
  if (!firstUnscored) {
    return; // tournament over
  }
  // player advanced to this round iff he is in this match
  // this match is by construction unscored so play this
  // if no pId passed in, then this is THE upcoming for the tournament
  if (!pId || firstUnscored.p.indexOf(pId) >= 0) {
    return firstUnscored.id;
  }
};


// interface
function KnockOut(numPlayers, koArray, matches) {
  this.kos = koArray;
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

KnockOut.prototype.scorable = function (id) {
  var m = $.firstBy(T.byId.bind(null, id), this.matches);
  // match exists, ready to be scored, and not already scored
  return (m && m.p && m.p.every($.neq(T.NA)) && !m.m);
};

KnockOut.prototype.score = function (id, mapScore) {
  return score(this.matches, this.kos[id.r - 1] || 0, id, mapScore);
};

KnockOut.prototype.representation = rep;

KnockOut.prototype.results = function () {
  return results(this.matches, this.kos);
};

KnockOut.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, this.ko, playerId);
};

KnockOut.prototype.isDone = function () {
  var gf = this.matches[this.matches.length-1];
  return Array.isArray(gf.m); // always done if last match scored
};


module.exports = KnockOut;
