var $ = require('interlude');

function Base(np, ms) {
  this.matches = ms;
}

// no player propagated marker - seeds 1-indexed
Object.defineProperty(Base, 'NONE', {
  enumerable: true,
  value: 0
});

//------------------------------------------------------------------
// Serialization/deserialization (NOT FOR DATABASE USAGE)
//------------------------------------------------------------------

Base.parse = function (SubClass, str) {
  var obj = JSON.parse(str);
  obj.rep = SubClass.idString || $.constant('UNKNOWN');
  return $.extend(Object.create(SubClass.prototype), obj);
};

Base.prototype.toString = function () {
  return JSON.stringify(this);
};

//------------------------------------------------------------------
// Multi stage helpers
//------------------------------------------------------------------

var createReceiver = function (Klass) {
  return function (inst, numPlayers, opts) {
    var err = "Cannot forward from " + inst.name + ": ";
    if (!inst.isDone()) {
      throw new Error(err + "tournament not done");
    }
    var res = inst.results();
    if (res.length < numPlayers) {
      throw new Error(err + "not enough players");
    }
    var luckies = res.filter(function (r) {
      return r.pos <= numPlayers;
    });
    if (luckies.length > numPlayers) {
      throw new Error(err + "too many players tied to pick out top " + numPlayers);
    }
    var forwarded = new Klass(numPlayers, opts);
    forwarded._replace(res); // correct when class is of standard format
    return forwarded;
  };
};

Base.prototype._replace = function (resAry) {
  var hasStarted = this.matches.some(function (m) {
    return m.p.every($.gt(Base.NONE)) && m.m;
  });
  if (hasStarted) {
    throw new Error("Cannot replace players for a tournament in progress");
  }
  // because resAry is always sorted by .pos, we simply use this to replace seeds
  this.matches.forEach(function (m) {
    m.p = m.p.map(function (oldSeed) {
      // as long as they are actual players
      return (oldSeed > 0) ? resAry[oldSeed-1].seed : oldSeed;
    });
  });
};

// TODO: eventually turn resAry into a ES6 Map
Base.resultEntry = function (resAry, seed) {
  for (var i = 0; i < resAry.length; i += 1) {
    if (resAry[i].seed === seed) {
      return resAry[i];
    }
  }
  throw new Error("Internal result lookup error for " + seed);
};

//------------------------------------------------------------------
// Inheritance helpers
//------------------------------------------------------------------

Base.sub = function (name, init, Initial) {
  Initial = Initial || Base;

  var Klass = function (numPlayers, opts) {
    if (!(this instanceof Klass)) {
      return new Klass(numPlayers, opts);
    }

    if (!Klass.invalid) {
      throw new Error(name + " must implement an Invalid function");
    }
    if (Klass.defaults) {
      opts = Klass.defaults(numPlayers, opts);
    }

    var invReason = Klass.invalid(numPlayers, opts);
    if (invReason !== null) {
      console.error("Invalid %d player %s with opts=%j rejected",
        numPlayers, name, opts
      );
      throw new Error("Cannot construct " + name + ": " + invReason);
    }

    this.numPlayers = numPlayers;
    this.name = name;

    // call given init method, and pass in next constructor as cb
    init.call(this, opts, Initial.bind(this, numPlayers));
  };
  Base.inherit(Klass, Initial);
  return Klass;
};

// two statics that can be overridden with configure
Base.invalid = $.constant(null);
Base.defaults = function (np, opts) {
  return $.extend({}, opts || {});
};

var configure = function (Klass, obj, Initial) {
  if (obj.defaults) {
    Klass.defaults = function (np, opts) {
      return obj.defaults(np, Initial.defaults(np, opts));
    };
  }
  else {
    Klass.defaults = Initial.defaults;
  }
  if (obj.invalid) {
    Klass.invalid = function (np, opts) {
      if (!Base.isInteger(np)) {
        return "numPlayers must be a finite integer";
      }
      opts = Klass.defaults(np, opts);
      var invReason = obj.invalid(np, opts);
      if (invReason !== null) {
        return invReason;
      }
      return null;
    };
  }
  else {
    Klass.invalid = Initial.invalid;
  }
};

Base.inherit = function (Klass, Initial) {
  Initial = Initial || Base;
  Klass.prototype = Object.create(Initial.prototype);

  // ensure deeper sub classes preserve chains whenever they are set up
  // this way any deeper sub classes can always just call the previous method
  // also, if any are implemented, it just replaces the default one here
  var methods = {
    '_verify': null,
    '_progress': undefined,
    '_limbo': undefined,
    '_early': false,
    '_initResult': {}
  };
  Object.keys(methods).forEach(function (fn) {
    if (Initial.prototype[fn]) {
      Klass.prototype[fn] = Initial.prototype[fn];
    }
    if (!Initial.prototype[fn]) {
      Klass.prototype[fn] = $.constant(methods[fn]);
    }
  });

  Klass.parse = function (str) {
    return Base.parse(Klass, str);
  };

  Klass.idString = Initial.idString; // default TODO necessary now?
  // TODO: this is bad, rep always uses innitial now..
  Object.defineProperty(Klass.prototype, 'rep', {
    value: Klass.idString
  });

  Klass.configure = function (obj) {
    return configure(Klass, obj, Initial);
  };

  Klass.inherit = function (SubKlass) {
    return Initial.inherit(SubKlass, Klass);
  };

  Klass.sub = function (subName, init) {
    return Initial.sub(subName, init, Klass);
  };

  Klass.from = createReceiver(Klass);
};

//------------------------------------------------------------------
// Misc helpers
//------------------------------------------------------------------

Base.idString = function (id) {
  return "S" + id.s + " R" + id.r + " M" + id.m;
};

Base.isInteger = function (n) { // until this gets on Number in ES6
  return Math.ceil(n) === n;
};

//------------------------------------------------------------------
// Comparators and sorters
//------------------------------------------------------------------

// ensures first matches first and (for most part) forEach scorability
// similarly how it's read in many cases: WB R2 G3, G1 R1 M1
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

//------------------------------------------------------------------
// TieComputers
//------------------------------------------------------------------

// tie position an assumed sorted resAry using a metric fn
// the metric fn must be sufficiently linked to the sorting fn used
Base.resTieCompute = function (resAry, startPos, cb, metric) {
  var pos = startPos
    , ties = 0
    , points = -Infinity;

  for (var i = 0; i < resAry.length; i += 1) {
    var r = resAry[i];
    var metr = metric(r);

    if (metr === points) {
      ties += 1;
    }
    else {
      pos += ties + 1;
      ties = 0;
    }
    points = metr;
    cb(r, pos);
  }
};

// tie position an individual match by passing in a slice of the
// zipped players and scores array, sorted by compareZip
Base.matchTieCompute = function (zipSlice, startIdx, cb) {
  var pos = startIdx
    , ties = 0
    , scr = -Infinity;

  // loop over players in order of their score
  for (var k = 0; k < zipSlice.length; k += 1) {
    var pair = zipSlice[k]
      , p = pair[0]
      , s = pair[1];

    // if this is a tie, pos is previous one, and next real pos must be incremented
    if (scr === s) {
      ties += 1;
    }
    else {
      pos += 1 + ties; // if we tied, must also + that
      ties = 0;
    }
    scr = s;
    cb(p, pos); // user have to find resultEntry himself from seed
  }
};

//------------------------------------------------------------------
// Prototype interface that expects certain implementations
//------------------------------------------------------------------

Base.prototype.isDone = function () {
  if (this.matches.every($.get('m'))) {
    return true;
  }
  return this._early();
};

Base.prototype.upcoming = function (playerId) {
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.p.indexOf(playerId) >= 0 && !m.m) {
      return m.id;
    }
  }
  return this._limbo(playerId);
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
  return this._verify(m, score);
};

Base.prototype.score = function (id, score) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  var m = this.findMatch(id);
  m.m = score;
  this._progress(m);
  return true;
};

Base.prototype.results = function () {
  var players = this.players();
  if (this.numPlayers !== players.length) {
    var why = players.length + " !== " + this.numPlayers;
    throw new Error(this.name + " initialized numPlayers incorrectly: " + why);
  }

  var res = new Array(this.numPlayers);
  for (var s = 0; s < this.numPlayers; s += 1) {
    // res is no longer sorted by seed initially
    res[s] = {
      seed: players[s],
      wins: 0,
      for: 0,
      against: 0,
      pos: this.numPlayers
    };
    $.extend(res[s], this._initResult(players[s]));
  }
  if (typeof this._stats === 'function') {
    this.matches.reduce(this._stats.bind(this), res);
  }
  return (typeof this._sort === 'function') ?
    this._sort(res) :
    res.sort(Base.compareRes); // sensible default
};

//------------------------------------------------------------------
// Prototype convenience methods
//------------------------------------------------------------------

Base.prototype.resultsFor = function (seed) {
  var res = this.results();
  for (var i = 0; i < res.length; i += 1) {
    var r = res[i];
    if (r.seed === seed) {
      return r;
    }
  }
};

Base.prototype.isPlayable = function (match) {
  return !match.p.some($.eq(Base.NONE));
};


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

var splitBy = function (ms, splitKey, filterKey, filterVal) {
  var res = [];
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (filterVal == null || m.id[filterKey] === filterVal) {
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
  return splitBy(this.matches, 'r', 's', section);
};
// partition matches into sections (optionally fix round)
Base.prototype.sections = function (round) {
  return splitBy(this.matches, 's', 'r', round);
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

Base.prototype.matchesFor = function (playerId) {
  return this.matches.filter(function (m) {
    return m.p.indexOf(playerId) >= 0;
  });
};

// returns all players that exists in a partial slice of the tournament
Base.prototype.players = function (id) {
  return $.nub(this.findMatches(id || {}).reduce(function (acc, m) {
    return acc.concat(m.p);
  }, [])).filter($.gt(Base.NONE)).sort($.compare()); // ascending order
};


module.exports = Base;
