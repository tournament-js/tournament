var $ = require('interlude');
var T = require('./public');

function Base(ms) {
  this.matches = ms;
}

// stuff that individual implementations can override
// Used by FFA, GroupStage, TieBreaker
// KnockOut + Duel implement slightly different versions
Base.prototype.isDone = function () {
  return this.matches.every($.get('m'));
};

// Default used by Duel, KnockOut, GroupStage, TieBreaker
// FFA adds extra logic as tournament is in limbo until currentRound all scored
// NB: can't be extended to non-playerId version because Duel can have unused matches
Base.prototype.upcoming = function (playerId) {
  // find first unplayed, pick by round asc [matches are sorted, can pick first]
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.p.indexOf(playerId) >= 0 && !m.m) {
      return m.id;
    }
  }
};

Base.prototype.unscorable = function (id, score, allowPast) {
  var m = this.findMatch(id);
  if (!m) {
    return "match not found in tournament"; // TODO: idString %s or, %j in id?
  }
  if (m.p.some($.eq(T.NA))) {
    return "match not ready - missing players";
  }
  if (!Array.isArray(score) || !score.every(Number.isFinite)) {
    return "scores must be a numeric array";
  }
  if (score.length !== m.p.length) {
    return "scores must have length " + m.p.length;
  }
  if (!allowPast && Array.isArray(m.m)) {
    return "cannot re-score match";
  }
  return null;
};

/*
Base.prototype.scoreRaw = function (id, mapScore) {
  // assumes !SubClass.unscorable
  var m = this.findMatch(id);
  m.m = mapScore;
  return m;
};
*/

// Public API extensions
// matches are stored in a sorted array rather than an ID -> Match map
// This is because ordering is more important than being able to access any match
// at any time. Looping to find the one is also quick because ms is generally short.
Base.prototype.findMatch = function (id) {
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.id.s === id.s && m.id.r === id.r && m.id.m === id.m) {
      return m;
    }
  }
};

// filter from this.matches for everything matching a partial Id
Base.prototype.findMatches = function (id) {
  return this.matches.filter(function (m) {
    return (id.s == null || m.id.s === id.s) &&
           (id.r == null || m.id.r === id.r) &&
           (id.m == null || m.id.m === id.m);
  });
};

Base.prototype.findMatchesRanged = function (lb, ub) {
  ub = ub || {};
  return this.matches.filter(function (m) {
    return (lb.s == null || m.id.s >= lb.s) &&
           (lb.r == null || m.id.r >= lb.r) &&
           (lb.m == null || m.id.m >= lb.m) &&
           (ub.s == null || m.id.s <= ub.s) &&
           (ub.r == null || m.id.r <= ub.r) &&
           (ub.m == null || m.id.m <= ub.m);
  });
};

// partition matches into rounds (optionally fix section)
Base.prototype.rounds = function (section) {
  var rnds = [];
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (section == null || m.id.s === section) {
      if (!Array.isArray(rnds[m.id.r - 1])) {
        rnds[m.id.r - 1] = [];
      }
      rnds[m.id.r - 1].push(m);
    }
  }
  return rnds;
};
// partition matches into sections (optionally fix round)
// i.e. get [WB, LB] in Duel, get [group 1, ..] in GroupStage
Base.prototype.sections = function (round) {
  var secs = [];
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (round == null || m.id.r === round) {
      if (!Array.isArray(secs[m.id.s - 1])) {
        secs[m.id.s - 1] = [];
      }
      secs[m.id.s - 1].push(m);
    }
  }
  return secs;
};

var roundNotDone = function (rnd) {
  return rnd.some(function (m) {
    return !m.m;
  });
};
Base.prototype.currentRound = function (section) {
  return $.firstBy(roundNotDone, this.rounds(section));
};

Base.prototype.nextRound = function (section) {
  var rounds = this.rounds(section);
  for (var i = 0; i < rounds.length; i += 1) {
    if (roundNotDone(rounds[i])) {
      return rounds[i+1];
    }
  }
};


// track a player's progress through a tournament
Base.prototype.matchesFor = function (playerId) {
  return this.matches.filter(function (m) {
    return m.p.indexOf(playerId) >= 0;
  });
};

// returns all players that exists in a partial slice of the tournament
// 1. Duel: all players in round 5 WB    -> this.players({r: 5, b: t.WB})
// 2. GroupStage: all players in group 3 -> this.players({s: 3})
// similarly for FFA and TieBreaker.
// NB: KnockOut structure is simple enough to use this.matches[r+1] instead of {r: r}
Base.prototype.players = function (id) {
  return $.nub(this.findMatches(id).reduce(function (acc, m) {
    acc = acc.concat(m.p);
    return acc;
  }, [])).sort($.compare()); // ascending order
};


// shortcut for
Base.prototype.resultsFor = function (seed) {
  var res = this.results();
  for (var i = 0; i < res.length; i += 1) {
    var r = res[i];
    if (r.seed === seed) {
      return r;
    }
  }
};

module.exports = Base;
