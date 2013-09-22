var T = {
  WO : -1,  // bye/walk-over marker (duel/balancer)
  NA : 0,   // player not ready marker (ffa/duel/knockout)
  // brackets: duel only (for now.. crossovers could change that)
  // Bracket numbers are locked down for the the following logical equivalence:
  // numBrackets === n <=> lastBracket === n <=> n-tuple elimination
  WB : 1,
  LB : 2,
  TB : 3
},
$ = require('interlude');

// matches are stored in a sorted array rather than an ID -> Match map
// This is because ordering is more important than being able to access any match
// at any time. Looping to find the one is also quick because ms is generally short.
T.findMatch = function (ms, id) {
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (m.id.s === id.s && m.id.r === id.r && m.id.m === id.m) {
      return m;
    }
  }
};

T.prototype = {
  /**
  * tells if every match in the round has score
  * @param round Object {r,s}
  */
  isRoundDone: function (round) {
    var match = $.firstBy(function (m) {
      return m.id.s === round.s && m.id.r === round.r && !m.m;
    }, this.matches);

    return !match;
  },
  /**
  * return all rounds
  */
  getRounds: function () {
    var rounds = [],
      found,
      s;

    this.matches.every(function(cur) {
      found = $.firstBy(function (m) {
        return cur.id.s === m.s && cur.id.r === m.r;
      }, rounds);

      if (!found) {
        rounds.push({s: cur.id.s, r: cur.id.r});
      }
      return true;
    });

    return rounds;
  },
  /**
  * return round data
  * @param round Object {r,s}
  */
  getRound: function (round) {
    var matches = [],
      found,
      s;

    this.matches.every(function(cur) {
      if (cur.id.s === round.s && cur.id.r === round.r) {
        matches.push(cur);
      }
      return true;
    });

    return matches;
  },
  /**
  * get matches list, alias of getRound if removed_finished=falsy
  * @param round Object {r,s}
  * @param removed_finished Boolean
  */
  getMatches: function(round, removed_finished) {
    removed_finished = removed_finished || false;
    var ret = this.getRound(round);
    if (removed_finished) {
        ret.filter($.get("m"));
    }
    return ret;
  },
  /**
  * return match data
  * @param round Object {r,s,m}
  */
  getMatch: function (match) {
    return T.findMatch(this.matches, match);
  },

  /**
  * return the fisrt round that some matches didn't have score
  */
  getCurrentRound: function() {
    var r = this.getRounds(),
      i;

    for (i = 0; i < r.length; i += 1) {
      if (!this.isRoundDone(r[i])) {
        return r[i];
      }
    }
    return null;
  },
  /**
  * return the fisrt round that some matches didn't have score
  */
  getNextRound: function() {
    var r = this.getRounds(),
      i;

    for (i = 0; i < r.length; i += 1) {
      if (!this.isRoundDone(r[i])) {
        ++i;
        return i < r.length ? r[i] : null;
      }
    }
    return null;
  },
  /**
  * return the fisrt round that some matches didn't have score
  */
  getPosition: function(pId) {
    var r = this.results(),
      i;

    for (i = 0; i < r.length; i += 1) {
      if (r[i].seed === pId) {
        return r[i].pos;
      }
    }
    return null;
  },
  /**
  * return the fisrt round that some matches didn't have score
  */
  getPlayersIn: function(round) {
    var players = [],
      found,
      s,
      i,
      j,
      cur;

    for (i = 0; i < this.matches.length; ++i) {
      cur = this.matches[i];
      if (cur.id.s === round.s && cur.id.r === round.r) {
        for (j = 0; j < cur.p.length; ++j) {
          players.push(cur.p[j]);
        }
      }

    }

    return players;
  }

};

module.exports = T;
