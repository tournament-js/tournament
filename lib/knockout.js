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
  matches.push({id: {s:1, r:1, m:1}, p:$.range(np)});
  for (var i = 0; i < kos.length; i += 1) {
    var ko = kos[i];

    // how many previous - ko is in next
    var leftover = matches[matches.length-1].p.length - ko;
    matches.push({id: {s:1, r:i+2, m:1}, p:$.replicate(leftover, T.NA)});
  }
  // when kos is empty we assume it's the final
  return matches;
};

var score = function (ms, ko, id, score) {
  // 0. a) basic sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms);
  var adv = m.p.length - ko;
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
  else if (ko > 0 && score[ko-1] === score[ko]) {
    // 0. b) ensure scores are sufficiently unambiguous in who won
    log.error("scores must unambiguous decide who is in the top %s", adv);
  }
  else {
    passed = true;
  }

  if (!passed) {
    log.error("failed scoring %s with %j", rep(id), score);
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
  console.log("top:", top);

  var nextM = $.firstBy(T.byId.bind(null, {s: 1, r: m.id.r+1, m:1}), ms);
  console.log('next id:', nextM.id);

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
  for (var s = 0; s < ms[0].length; s += 1) {
    res[s] = {
      seed : s + 1,
      sum  : 0,
      wins : 0,
      pos  : ms[0].length
    };
  }

  // results after first match:
  // winners should be tied at ms[1].length, non advancers gets their pos from ms[0] scores
  // if final, everyone gets their pos from last m scores

  // thus we can loop over kos and things should work
};

function KnockOut(numPlayers, koArray) {
  this.numPlayers = numPlayers;
  this.kos = koArray;
  this.matches = knockout(numPlayers, koArray);
}

KnockOut.prototype.scorable = function (id) {
  var m = $.firstBy(T.byId.bind(null, id), this.matches);
  // match exists, ready to be scored, and not already scored
  return (m && m.p && m.p.every($.neq(T.NA)) && !m.m);
};

KnockOut.prototype.score = function (id, mapScore) {
  return score(this.matches, this.kos[id.r - 1] || 0, id, mapScore);
};

KnockOut.prototype.representation = rep;

KnockOut.prototype.isDone = function () {
  var gf = this.matches[this.matches.length-1];
  return Array.isArray(gf.m);
};


module.exports = KnockOut;
