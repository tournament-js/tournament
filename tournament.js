var $ = require('interlude');

function Tournament(np, ms) {
  this.matches = ms;
}
Tournament.prototype = Object.create(require('events').EventEmitter.prototype);

// no player propagated marker - seeds 1-indexed
Object.defineProperty(Tournament, 'NONE', {
  enumerable: true,
  value: 0
});

//------------------------------------------------------------------
// Serialization/deserialization (NOT FOR DATABASE USAGE)
//------------------------------------------------------------------

Tournament.parse = function (SubClass, str) {
  var obj = JSON.parse(str);
  return $.extend(Object.create(SubClass.prototype), obj);
};

Tournament.prototype.toString = function () {
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

Tournament.prototype._replace = function (resAry) {
  var hasStarted = this.matches.some(function (m) {
    return m.p.every($.gt(Tournament.NONE)) && m.m;
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
Tournament.resultEntry = function (resAry, seed) {
  for (var i = 0; i < resAry.length; i += 1) {
    if (resAry[i].seed === seed) {
      return resAry[i];
    }
  }
  throw new Error("No result found for seed " + seed + " in result array:" + resAry);
};

//------------------------------------------------------------------
// Misc helpers
//------------------------------------------------------------------

// TODO: actually this is kind of bad...
// if people are calling score explicitally with a correct looking id
// then stringify won't work because it's not an instance if the specific Id
//
// on the OTHER hand if they checked if id exists by var m = trn.findMatch;
// then can always trn.score(m.id, MATCHRESULT) and it will work..
var idString = function (id) {
  return (id + '' === '[object Object]') ?
    "S" + id.s + " R" + id.r + " M" + id.m :
    id + '';
};

Tournament.isInteger = function (n) { // until this gets on Number in ES6
  return Math.ceil(n) === n;
};

//------------------------------------------------------------------
// Inheritance helpers
//------------------------------------------------------------------

Tournament.sub = function (name, init, Initial) {
  Initial = Initial || Tournament;

  var Klass = function (numPlayers, opts) {
    if (!(this instanceof Klass)) {
      return new Klass(numPlayers, opts);
    }

    if (!Klass.invalid) {
      throw new Error(name + " must implement an Invalid function");
    }
    if (Klass.defaults) {
      // NB: does not modify input unless Klass.defaults does
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
  Tournament.inherit(Klass, Initial);
  return Klass;
};

// two statics that can be overridden with configure
Tournament.invalid = $.constant(null);
Tournament.defaults = function (np, opts) {
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
      if (!Tournament.isInteger(np)) {
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

Tournament.inherit = function (Klass, Initial) {
  Initial = Initial || Tournament;
  Klass.prototype = Object.create(Initial.prototype);

  // ensure deeper sub classes preserve chains whenever they are set up
  // this way any deeper sub classes can always just call the previous method
  // also, if any are implemented, it just replaces the default one here
  var methods = {
    _verify: null,
    _progress: undefined,
    _limbo: undefined,
    _early: false,
    _initResult: {}
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
    return Tournament.parse(Klass, str);
  };

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
// Comparators and sorters
//------------------------------------------------------------------

// ensures first matches first and (for most part) forEach scorability
// similarly how it's read in many cases: WB R2 G3, G1 R1 M1
Tournament.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

// how to sort results array (of objects) : by position desc (or seed asc for looks)
// only for sorting (more advanced `pos` algorithms may be used separately)
Tournament.compareRes = function (r1, r2) {
  return (r1.pos - r2.pos) || (r1.seed - r2.seed);
};

// internal sorting of zipped player array with map score array : zip(g.p, g.m)
// sorts by map score desc, then seed asc
Tournament.compareZip = function (z1, z2) {
  return (z2[1] - z1[1]) || (z1[0] - z2[0]);
};

// helper to get the player array in a match sorted by compareZip
Tournament.sorted = function (match) {
  return $.zip(match.p, match.m).sort(Tournament.compareZip).map($.get('0'));
};

//------------------------------------------------------------------
// Tie computers
//------------------------------------------------------------------

// tie position an assumed sorted resAry using a metric fn
// the metric fn must be sufficiently linked to the sorting fn used
Tournament.resTieCompute = function (resAry, startPos, cb, metric) {
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
Tournament.matchTieCompute = function (zipSlice, startIdx, cb) {
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

Tournament.prototype.isDone = function () {
  if (this.matches.every($.get('m'))) {
    return true;
  }
  return this._early();
};

Tournament.prototype.upcoming = function (playerId) {
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.p.indexOf(playerId) >= 0 && !m.m) {
      return m.id;
    }
  }
  return this._limbo(playerId);
};

Tournament.prototype.unscorable = function (id, score, allowPast) {
  var m = this.findMatch(id);
  if (!m) {
    return idString(id) + " not found in tournament";
  }
  if (!this.isPlayable(m)) {
    return idString(id) + " not ready - missing players";
  }
  if (!Array.isArray(score) || !score.every(Number.isFinite)) {
    return idString(id) + " scores must be a numeric array";
  }
  if (score.length !== m.p.length) {
    return idString(id) + " scores must have length " + m.p.length;
  }
  if (!allowPast && Array.isArray(m.m)) {
    return idString(id) + " cannot be re-scored";
  }
  return this._verify(m, score);
};

Tournament.prototype.score = function (id, score) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", idString(id), score);
    console.error("reason:", invReason);
    return false;
  }
  var m = this.findMatch(id);
  m.m = score;
  this._progress(m);
  this.emit('score', id, score);
  return true;
};

Tournament.prototype.results = function () {
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
  if (this._stats instanceof Function) {
    this.matches.reduce(this._stats.bind(this), res);
  }
  return (this._sort instanceof Function) ?
    this._sort(res) :
    res.sort(Tournament.compareRes); // sensible default
};

//------------------------------------------------------------------
// Prototype convenience methods
//------------------------------------------------------------------

Tournament.prototype.resultsFor = function (seed) {
  var res = this.results();
  for (var i = 0; i < res.length; i += 1) {
    var r = res[i];
    if (r.seed === seed) {
      return r;
    }
  }
};

Tournament.prototype.isPlayable = function (match) {
  return !match.p.some($.eq(Tournament.NONE));
};


// matches are stored in a sorted array rather than an ID -> Match map because
// ordering is more important than quick lookup for the generally short matches ary
Tournament.prototype.findMatch = function (id) {
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.id.s === id.s && m.id.r === id.r && m.id.m === id.m) {
      return m;
    }
  }
};

// filter from this.matches for everything matching a partial Id
Tournament.prototype.findMatches = function (id) {
  return this.matches.filter(function (m) {
    return (id.s == null || m.id.s === id.s) &&
           (id.r == null || m.id.r === id.r) &&
           (id.m == null || m.id.m === id.m);
  });
};

Tournament.prototype.findMatchesRanged = function (lb, ub) {
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
Tournament.prototype.rounds = function (section) {
  return splitBy(this.matches, 'r', 's', section);
};
// partition matches into sections (optionally fix round)
Tournament.prototype.sections = function (round) {
  return splitBy(this.matches, 's', 'r', round);
};

var roundNotDone = function (rnd) {
  return rnd.some(function (m) {
    return !m.m;
  });
};
Tournament.prototype.currentRound = function (section) {
  return $.firstBy(roundNotDone, this.rounds(section));
};
Tournament.prototype.nextRound = function (section) {
  var rounds = this.rounds(section);
  for (var i = 0; i < rounds.length; i += 1) {
    if (roundNotDone(rounds[i])) {
      return rounds[i+1];
    }
  }
};

Tournament.prototype.matchesFor = function (playerId) {
  return this.matches.filter(function (m) {
    return m.p.indexOf(playerId) >= 0;
  });
};

// returns all players that exists in a partial slice of the tournament
Tournament.prototype.players = function (id) {
  return $.nub(this.findMatches(id || {}).reduce(function (acc, m) {
    return acc.concat(m.p);
  }, [])).filter($.gt(Tournament.NONE)).sort($.compare()); // ascending order
};


module.exports = Tournament;
