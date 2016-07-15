var $ = require('interlude');
var helper = require('./match');

function Tournament(np, ms) {
  this.matches = ms;
  this.state = [];
}

Object.defineProperty(Tournament, 'NONE', { enumerable: true, value: helper.NONE });
Object.defineProperty(Tournament, 'helpers', { value: helper });

// ------------------------------------------------------------------
// Multi stage helpers
// ------------------------------------------------------------------

var replaceMatches = function (inst, resAry) {
  if (helper.started(inst.matches)) {
    throw new Error('Cannot replace players for a tournament in progress');
  }
  // because resAry is always sorted by .pos, we simply use this to replace seeds
  inst.matches.forEach(function (m) {
    m.p = m.p.map(function (oldSeed) {
      // as long as they are actual players
      return (oldSeed > 0) ? resAry[oldSeed-1].seed : oldSeed;
    });
  });
};

Tournament.from = function (Klass, inst, numPlayers, opts) {
  var err = 'Cannot forward from ' + inst.name + ': ';
  if (!inst.isDone()) {
    throw new Error(err + 'tournament not done');
  }
  var res = inst.results();
  if (res.length < numPlayers) {
    throw new Error(err + 'not enough players');
  }
  var luckies = res.filter(function (r) {
    return r.pos <= numPlayers;
  });
  if (luckies.length > numPlayers) {
    throw new Error(err + 'too many players tied to pick out top ' + numPlayers);
  }
  var forwarded = new Klass(numPlayers, opts);
  replaceMatches(forwarded, res); // correct when class is of standard format
  return forwarded;
};

// TODO: eventually turn resAry into a ES6 Map
Tournament.resultEntry = function (resAry, seed) {
  for (var i = 0; i < resAry.length; i += 1) {
    if (resAry[i].seed === seed) {
      return resAry[i];
    }
  }
  throw new Error('No result found for seed ' + seed + ' in result array:' + resAry);
};

// ------------------------------------------------------------------
// Misc helpers
// ------------------------------------------------------------------

var idString = function (id) {
  return (id + '' === '[object Object]') ?
    'S' + id.s + ' R' + id.r + ' M' + id.m :
    id + '';
};

Tournament.isInteger = function (n) { // until this gets on Number in ES6
  return Math.ceil(n) === n;
};

// ------------------------------------------------------------------
// Inheritance helpers
// ------------------------------------------------------------------

Tournament.sub = function (name, init, Initial_) {
  var Initial = Initial_ || Tournament;

  var Klass = function (numPlayers, opts_) {
    if (!(this instanceof Klass)) {
      return new Klass(numPlayers, opts_);
    }

    if (!Klass.invalid) {
      throw new Error(name + ' must implement an Invalid function');
    }

    Object.defineProperty(this, '_opts', {
      configurable: true,
      value: (Klass.defaults ? Klass : Initial).defaults(numPlayers, opts_)
    });

    var invReason = Klass.invalid(numPlayers, this._opts);
    if (invReason !== null) {
      this._opts.log.error('Invalid %d player %s with opts=%j rejected',
        numPlayers, name, this._opts
      );
      throw new Error('Cannot construct ' + name + ': ' + invReason);
    }

    this.numPlayers = numPlayers;
    this.name = name;

    // call given init method, and pass in parent constructor as cb
    init.call(this, this._opts, Initial.bind(this, numPlayers));
  };
  Initial.inherit(Klass, Initial);
  return Klass;
};

// two statics that can be overridden with configure
Tournament.invalid = $.constant(null);
Tournament.defaults = function (np, opts) {
  var o = $.extend({}, opts || {});
  o.log = opts && opts.log ? opts.log : console;
  return o;
};

Tournament.configure = function (Klass, obj, Initial_) {
  var Initial = Initial_ || Tournament;
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
        return 'numPlayers must be a finite integer';
      }
      var invReason = obj.invalid(np, Klass.defaults(np, opts));
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

Tournament.inherit = function (Klass, Initial_) {
  var Initial = Initial_ || Tournament;
  Klass.prototype = Object.create(Initial.prototype);

  // Ensure deeper sub classes preserve chains whenever they are set up
  // This way any deeper sub classes can always just call the previous method
  // NB: If users subclass these later on, they just replaces the default ones here
  var virtuals = {
    _verify: null,
    _progress: undefined,
    _early: false,
    _safe: false,
    _initResult: {}
  };
  Object.keys(virtuals).forEach(function (fn) {
    // Implement a default if not already implemented (when Initial is Tournament)
    Klass.prototype[fn] = Initial.prototype[fn] || $.constant(virtuals[fn]);
  });

  Klass.from = function (inst, numPlayers, opts) {
    return Tournament.from(Klass, inst, numPlayers, opts);
  };

  Klass.restore = function (numPlayers, opts, state, data) {
    var trn = new Klass(numPlayers, opts);
    // score the tournament from the valid score calls in state that we generate
    state.forEach(function (o) {
      if (o.type === 'score') {
        trn.score(o.id, o.score);
      }
    });
    // also re-attach match data to the appropriate matches if passed in
    // user is responsible for sanity checking what they put on each match.data
    (data || []).forEach(function (d) {
      trn.findMatch(d.id).data = d.data;
    });
    return trn;
  };

  Klass.configure = function (obj) {
    return Tournament.configure(Klass, obj, Initial);
  };

  // ways to inherit from a tournament subclass:
  Klass.sub = function (subName, init) {
    return Initial.sub(subName, init, Klass);
  };

  Klass.inherit = function (SubKlass) {
    return Initial.inherit(SubKlass, Klass);
  };
};

// ------------------------------------------------------------------
// Comparators and sorters
// ------------------------------------------------------------------

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

// internal sorting of zipped player array with map score array : zip(m.p, m.m)
// sorts by map score desc, then seed asc
Tournament.compareZip = function (z1, z2) {
  return (z2[1] - z1[1]) || (z1[0] - z2[0]);
};

// helper to get the player array in a match sorted by compareZip
Tournament.sorted = function (m) {
  return $.zip(m.p, m.m).sort(Tournament.compareZip).map($.get('0'));
};

// ------------------------------------------------------------------
// Tie computers
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Prototype interface that expects certain implementations
// ------------------------------------------------------------------

Tournament.prototype.isDone = function () {
  return this.matches.every($.get('m')) || this._early();
};

Tournament.prototype.unscorable = function (id, score, allowPast) {
  var m = this.findMatch(id);
  if (!m) {
    return idString(id) + ' not found in tournament';
  }
  if (!this.isPlayable(m)) {
    return idString(id) + ' not ready - missing players';
  }
  if (!Array.isArray(score) || !score.every(Number.isFinite)) {
    return idString(id) + ' scores must be a numeric array';
  }
  if (score.length !== m.p.length) {
    return idString(id) + ' scores must have length ' + m.p.length;
  }
  // if allowPast - you can do anything - but if not, it has to be safe
  if (!allowPast && Array.isArray(m.m) && !this._safe(m)) {
    return idString(id) + ' cannot be re-scored';
  }
  return this._verify(m, score);
};

Tournament.prototype.score = function (id, score) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    this._opts.log.error('failed scoring match %s with %j', idString(id), score);
    this._opts.log.error('reason:', invReason);
    return false;
  }
  var m = this.findMatch(id);
  m.m = score;
  this.state.push({ type: 'score', id: id, score: score });
  this._progress(m);
  return true;
};

Tournament.prototype.results = function () {
  var players = this.players();
  if (this.numPlayers !== players.length) {
    var why = players.length + ' !== ' + this.numPlayers;
    throw new Error(this.name + ' initialized numPlayers incorrectly: ' + why);
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

// ------------------------------------------------------------------
// Prototype convenience methods
// ------------------------------------------------------------------

Tournament.prototype.resultsFor = function (seed) {
  return $.firstBy(function (r) {
    return r.seed === seed;
  }, this.results());
};

Tournament.prototype.upcoming = function (playerId) {
  return helper.upcoming(this.matches, playerId);
};

Tournament.prototype.isPlayable = helper.playable;

Tournament.prototype.findMatch = function (id) {
  return helper.findMatch(this.matches, id);
};

Tournament.prototype.findMatches = function (id) {
  return helper.findMatches(this.matches, id);
};

Tournament.prototype.findMatchesRanged = function (lb, ub) {
  return helper.findMatchesRanged(this.matches, lb, ub);
};

Tournament.prototype.metadata = function () {
  return helper.metadata(this.matches);
};

// partition matches into rounds (optionally fix section)
Tournament.prototype.rounds = function (section) {
  return helper.partitionMatches(this.matches, 'r', 's', section);
};
// partition matches into sections (optionally fix round)
Tournament.prototype.sections = function (round) {
  return helper.partitionMatches(this.matches, 's', 'r', round);
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
  return helper.matchesForPlayer(this.matches, playerId);
};

Tournament.prototype.players = function (id) {
  return helper.players(this.findMatches(id || {}));
};

module.exports = Tournament;
