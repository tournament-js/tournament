var $ = require('interlude');

function Base(ms) {
  this.matches = ms;
}

// no player propagated marker - seeds 1-indexed
Object.defineProperty(Base, 'NONE', {
  enumerable: true,
  value: 0
});

Base.parse = function (SubClass, str) {
  var obj = JSON.parse(str);
  obj.rep = SubClass.idString || $.constant('UNKNOWN');
  return $.extend(Object.create(SubClass.prototype), obj);
};

// for .sub
var construct = function (Ctor, args) {
  var F = function () {
    return Ctor.apply(this, args);
  };
  F.prototype = Ctor.prototype;
  return new F();
};
// a crazy implementors helper that eliminates almost all boilerplate code
Base.sub = function (name, namedArgs, obj, Initial) {
  Initial = Initial || Base;
  var keys = Object.keys(obj);
  // sanity for implementors
  if (!obj.init) {
    throw new Error("Must supply an init function to .sub");
  }
  if (!namedArgs) {
    throw new Error("Must supply an array of arguments to .sub");
  }

  var Klass = function () {
    var args = Array.prototype.slice.call(arguments);
    if (!(this instanceof Klass)) {
      return construct(Klass, args);
    }
    if (!Klass.invalid) {
      throw new Error(name + " must have an Invalid function when constructing");
    }
    var invReason = Klass.invalid.apply(Klass, args);
    if (invReason !== null) {
      console.error("Invalid %s configuration", name, args);
      console.error("  :", invReason);
      return;
    }

    // attach properties to this from obj
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key !== 'init' && obj[key] !== 'function') {
        this[key] = obj[key];
      }
    }

    // attach properties to this from namedArgs
    for (var k = 0; k < namedArgs.length; k += 1) {
      this[namedArgs[k]] = args[k];
    }

    // call given init method, and pass in next constructor as cb
    obj.init.call(this, Initial.bind(this));
    if (!this.numPlayers) {
      throw new Error("numPlayers must be set on instance or be a named arg");
    }
  };
  Klass.prototype = Object.create(Initial.prototype);

  // attach prototype methods from obj
  // TODO: maybe pass in parent as a cb?
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (key !== 'init' && typeof obj[key] === 'function') {
      Klass.prototype[key] = obj[key];
    }
  }
  // ensure deeper sub classes preserve chains whenever they are set up
  // this way any deeper sub classes can always just call the previous method
  var returns = { verify: null, early: false, initResult: {} };
  ['verify', 'progress', 'limbo', 'early', 'initResult'].forEach(function (spec) {
    if (!obj[spec] && Initial.prototype[spec]) {
      Klass.prototype[spec] = Initial.prototype[spec];
    }
    if (!obj[spec] && !Initial.prototype[spec]) {
      Klass.prototype[spec] = $.constant(returns[spec]); // usually undefined
    }
  });

  Klass.parse = function (str) {
    return Base.parse(Klass, str);
  };
  Klass.idString = Initial.idString; // default
  Object.defineProperty(Klass.prototype, 'rep', {
    value: Klass.idString
  });

  Klass.sub = function (subName, subArgs, subObj) {
    return Initial.sub(subName, subArgs, subObj, Klass);
  };
  return Klass;
};

Base.idString = function (id) {
  return "S" + id.s + " R" + id.r + " M" + id.m;
};

Base.isInteger = function (n) { // until this gets on Number in ES6
  return Math.ceil(n) === n;
};

// comparators that used to be in common
// to ensure first matches first and (for most part) forEach scorability
// score section desc, else round desc, else match number desc
// similarly how it's read in many cases: WB R2 G3
Base.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

// how to sort results array (of objects) : by position desc (or seed asc for looks)
// only for sorting (more advanced `pos` algorithms may be used separately)
Base.compareRes = function (r1, r2) {
  return (r1.pos - r2.pos) || (r1.seed - r2.seed);
};

// internal sorting of zipped player array with map score array : zip(g.p, g.m)
// sorts by map score desc, then seed asc
Base.compareZip = function (z1, z2) {
  return (z2[1] - z1[1]) || (z1[0] - z2[0]);
};

// helper to get the player array in a match sorted by compareZip
Base.sorted = function (match) {
  return $.zip(match.p, match.m).sort(Base.compareZip).map($.get('0'));
};


// stuff that individual implementations can override
// Used by FFA, GroupStage, TieBreaker
// KnockOut + Duel implement slightly different versions
Base.prototype.isDone = function () {
  if (this.matches.every($.get('m'))) {
    return true;
  }
  return this.early();
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
  return this.limbo(playerId);
};

Base.prototype.unscorable = function (id, score, allowPast) {
  var m = this.findMatch(id);
  if (!m) {
    return "match not found in tournament"; // TODO: idString %s or, %j in id?
  }
  if (!this.isPlayable(m)) {
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
  return this.verify(m, score);
};


// the only way to fly
Base.prototype.score = function (id, score) {
  // we use the unscorable one highest up in the chain because by spec:
  // it must call Base.prototype.unscorable first if overridden
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  var m = this.findMatch(id);
  m.m = score;
  this.progress(m);

  return true;
};

Base.prototype.isPlayable = function (match) {
  return !match.p.some($.eq(Base.NONE));
};

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

var splitBy = function (ms, filterKey, splitKey, number) {
  var res = [];
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (number == null || m.id[filterKey] === number) {
      if (!Array.isArray(res[m.id[splitKey] - 1])) {
        res[m.id[splitKey] - 1] = [];
      }
      res[m.id[splitKey] - 1].push(m);
    }
  }
  return res;
};
// partition matches into rounds (optionally fix section)
Base.prototype.rounds = function (section) {
  return splitBy(this.matches, 's', 'r', section);
};
// partition matches into sections (optionally fix round)
Base.prototype.sections = function (round) {
  return splitBy(this.matches, 'r', 's', round);
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
  return $.nub(this.findMatches(id || {}).reduce(function (acc, m) {
    return acc.concat(m.p);
  }, [])).filter($.neq(Base.NONE)).sort($.compare()); // ascending order
};


// prepare a results array
// not always very helpful
Base.prototype.results = function (arg) {
  var res = new Array(this.numPlayers);
  for (var s = 0; s < this.numPlayers; s += 1) {
    res[s] = {
      seed: s + 1,
      wins: 0,
      for: 0,
      //against: 0, TODO: extend this to FFA and Masters
      pos: this.numPlayers
    };
    $.extend(res[s], this.initResult(s+1));
  }
  return this.stats(res, arg);
};

// shortcut for results
Base.prototype.resultsFor = function (seed) {
  var res = this.results();
  for (var i = 0; i < res.length; i += 1) {
    var r = res[i];
    if (r.seed === seed) {
      return r;
    }
  }
};

Base.prototype.toString = function () {
  return JSON.stringify(this);
};

module.exports = Base;
