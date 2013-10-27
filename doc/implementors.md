# Implementors guide

The simplest way to learn is to look at the simplest full implementation: [masters](https://github.com/clux/masters) - a sort of musical chairs style tournament, but this doc will explain all the details of implementing your own.

## Matches
You can create your own matches, but they MUST have the following format:

```js
{
  id: { s: Number, r: Number, m: Number},
  p: [Number],
  m: [Number]
}
```

With the following requirements:

 - All numbers MUST be 1-indexed integers
 - `.p` MUST be the array of seeding numbers representning players
 - All of the above `id` properties (`s`, `r`, and `m`) MUST exist even if some of them are identical for all matches
 - The `.data` key on the match MUST be reserved for users
 - The `.m` key on match MUST NOT be set on construction
 - The `.m` key on match MUST only be touched by `.score`
 - Every match `id` MUST be unique
 - If we sort the match id by `s` difference, then `r` difference, then `m` difference, we can score all the matches in this order

## Tournament outline - easy way

```js
var Base = require('tournament');

// Specify tournament names and the named arguments for its constructor
var SomeTournament = Base.sub('SomeTournament', ['numPlayers', 'opts'], {
  init: function (initParent) {
    var matches = makeMatches(this.numPlayers, this.opts);
    initParent(matches); // goes to Base's constructor
  },
  progress: function (match) {
    // TODO: propagate winners of match here if needed
  },
  verify: function (id, score) {
    // TODO: check for extra conditions here if needed
    return null;
  },
  limbo: function (playerId) {
    // TODO: check if we can figure out roughly where the player is headed
  },
  early: function () {
    // TODO: return true here if tournament is done early
    return false;
  },
  initResult: function (seed) {
    // TODO: initialize extra result properties here
    return {}; 
  },
  stats: function (res) {
    // TODO: fill in map based stats on res and sort res here
    return res;
  }
});

SomeTournament.invalid = function (numPlayers, opts) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np || np < 2) {
    return "number of players must be at least 2";
  }
  return null;
};
```

### Requirements

- `numPlayers` MUST exists as a named argument
- `invalid` MUST be defined on the class
- `init` MUST be implemented
- `stats` MUST be implemented
- `init` MUST call the `initParent` cb with the arguments of `Base` (matches only)

NB: For inheriting from another tournament, replace all references to `Base` with the tournament you are inheriting from.

Finally, you must leave the `data` key on the instance (`this`) untouched for user data.

#### invalid
Invalid is a function that MUST have the same parameters as your constructor (i.e. the same as the named arguments passed to `Base.sub`), and must return a reason why the current parameters can not produce a valid tournament, if this is the case. If the parameters are valid, return null.

This way you can produce sensible user feedback, ensured constructibility of tournaments, and set your own size limits.

```js
SomeTournament.invalid = function (numPlayers, opts) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np || np < 2) {
    return "number of players must be at least 2";
  }
  if (np > 64) {
    return "number of players cannot exceed 64"; // arbitrary limit
  }
  return null;
};
```

#### results
The arguably most important feature of tournaments is the ability to figure out and to compute statistics and winners at the end. If you don't implement the following, all you have a collection of matches.

##### stats
Called after `initResult` have been called `numPlayers` times and the array of results are called in. Fill in the statistics for your tournament here.

```js
  stats: function (resAry) {
    this.matches.forEach(function (m) {
      var winner = m.s[1] > m.s[0] ? m.p[1] : m.p[0];
      resAry[winner-1].wins += 1;
      resAry[winner-1].pos += 1;
    });
    return res.sort(Base.compareRes);
  }
```

Note that `resAry` is ONLY sorted by seeding number initially. Thus you can look up players by doing `resAry[seed-1]` and then modifying that object.

At the end of the `stats` function, however, you should ensure the `resAry` is sorted by `pos` descending, then optionally by other properties such as group position, map wins or losses (`.for` and `.against`), and with least priority, by `.seed` ascending.

Note Base helpers such as `Base.compareRes` and `Base.sorted` for computing statistics here.


### Useful Methods
It's often useful to supply the following methods

- `verify` - if extra scoring restrictions are necessary
- `progress` - if player propagation is necessary (tournaments with stages)
- `limbo` - if a player can exist in limbo (waiting for a round to finish)
- `early` - if a tournament can be done before all matches are played
- `initResult` - if extra properties for `stats` needs to be initialized


#### verify
Whenever a tournament gets asked to `.score()` a match, this gets called after some basic properties of value sanity is checked by the Base class.
If you implement this, verify only extra restrictions that you would like to put on scoring that is not already checked for by `Base.prototype.unscorable`.

```js
  verify: function (match, score) {
    if (score[0] === score[1]) {
      return "cannot draw"; // NOT OK
    }
    return null; // OK
  }
```

The return value MUST be a reason for the user, or NULL for OK.

#### progress
Whenever a match is scored successfully (all the `unscorable` - and, if exists, `verify` - methods in the inheritance chain allowed the scoring to happen), `progress` will be called with the newly scored match.

```js
  progress: function (match) {
    var next = this.findMatch({ s: 1, r: match.id.r + 1, m: 1 });
    if (next) {
      next.p = Base.sorted(match).slice(0, 2); // top 2 advance
    }
  }
```

If something goes wrong in this method, throw an error.

#### limbo
Called when `upcoming` is called with a `playerId` that was not found in any unscored matches. If your tournament type can keep players in "limbo" until a round or new stage is ready, you should do a best effort search here to see if you can figure out *PARTLY* where the player is going to end up.

```js
  limbo: function (playerId) {
    // player may be waiting for generation of next round
    var m = $.firstBy(function (m) {
      return m.p.indexOf(playerId) >= 0 && m.m;
    }, this.currentRound() || []);

    // if he played this round, check if he will advance
    if (m && Base.sorted(m).slice(0, 2).indexOf(playerId) >= 0) {
      // yes, was in top 2, return a partial id for next round (match number unknown)
      return {s: 1, r: m.id.r + 1};
    }
  }
```

#### early
Called when `isDone` is called and there are still matches remaining. If you implement this, you can decide if the tournament is done early, even if there are more matches to be played.

```js
  early: function () {
    // Double elimination Duel can be done early if GF game 1 is won by WB player
    var gf1 = this.matches[this.matches.length - 2];
    return this.isLong && this.last === LB && gf1.m && gf1.m[0] > gf1.m[1];
  }
```

##### initResult
Called early on after `results` is called and the result objects needs to be initialized. Most properties are already set in `Base.prototype.results`, but if you need custom statistical properties, initialize them here.

```js
  initResult: function (seed) {
    return {
      grp: this.groupFor(seed),
      losses: 0,
      draws: 0
    };
  }
```

NB: This can be a constant function, as all properties are copied onto the results array.

#### NB: Inheritance
If you implement one of the above, and inherit from another tournament that implements the same method, then you SHOULD call the method you are inheriting from:

```js
  verify: function (match, score) {
    var reason = SuperClass.verify.call(this, match, score);
    if (reason) return reason;
    // verify other conditions here as usual
    return null;
  },
  progress: function (match) {
    SuperClass.prototype.progress.call(this, match);
    // specific progression here as usual
  },
  limbo: function (playerId) {
    SuperClass.prototype.limbo.call(this, playerId);
    // specific search strategy here as usual
  },
  early: function () {
    SuperClass.prototype.early.call(this);
    // specific check here
  },
  initResult: function (seed) {
    var res = SuperClass.prototype.initResult.call(this, seed);
    // specific extensions here
  },
  stats: function (res) {
    var results = SuperClass.prototype.stats.call(this, res);
    // specific modifications to results here
  }
```

Note that if you are inheriting from another tournament, overriding these methods should only in rare cases be necessary.

### Useful extras
#### idString
If you need to get the string of a tournament id and what `Base.prototype.idString` returns doesn't feel right, you should add your own `idString` function to `SomeTournament.idString` directly. Most tournaments do this.
#### roundNames
TODO: talk about these?


## NB: OUTDATED DOCS BELOW USE EASY METHOD

## Tournament outline - manual inheritance
If you prefer to have full control of your prototypes, you may inherit manually from the `Base` class. Note that as per expectations of implementations behaviour, you should follow this outline as closely as possible.

```js
var Base = require('tournament');

function SomeTournament(numPlayers, opts) {
  if (!(this instanceof SomeTournament)) {
    return new someTournament(numPlayers, opts); // new protection
  }
  this.numPlayers = numPlayers; // always store this
  var invReason = SomeTournament.invalid(numPlayers, opts);
  if (invReason !== null) {
    if (invReason !== null) {
      console.error("Invalid SomeTournament configuration", numPlayers, opts);
      console.error("  :", invReason);
      return;
    }
  }
  var matches = []; // TODO: create your own matches
  Base.call(this, SomeTournament, matches);
}

// inherit from Base
SomeTournament.prototype = Object.create(Base.prototype);

// statics
SomeTournament.parse = function (str) {
  return Base.parse(SomeTournament, str);
};
SomeTournament.invalid = function (np, opts) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np || np < 2) {
    return "SomeTournament must contain at least 2 players";
  }
  return null;
};
SomeTournament.idString = function (id) {
  return "R" + id.r + " M" + id.m;
};

// methods
SomeTournament.prototype.results = function () {
  var res = []; // fill this in by analysing the matches
  return res;
};
SomeTournament.prototype.progress = function (match) {
  // TODO: propagate winners of match here if needed
};
SomeTournament.prototype.verify = function (id, score) {
  // TODO: check for extra conditions here if needed
  return null;
};
SomeTournament.prototype.limbo = function (playerId) {
  // TODO: check if we can figure out roughly where the player is headed
};
SomeTournament.prototype.early = function () {
  // TODO: return true here if tournament is done early
  return false;
};
SomeTournament.prototype.initResult = function (seed) {
  // TODO: initialize extra result properties here
  return {}; 
};
SomeTournament.prototype.stats = function (res) {
  // TODO: fill in map based stats on res and sort res here
  return res;
};

module.exports = SomeTournament;
```

### Requirements
Like in the outline, you MUST implement:

- constructor that calls the `Base` class constructor with the matches
- static `parse` that defers to `Base`
- static `invalid` that can give a string reason why tournament options are invalid
- method `stats` to compute statistics/progression

The latter is always the hard one.

Note that the constructor MUST set `numPlayers` on `this` as `Base` class helpers expects this variable.

Finally, you must leave the `data` key on the instance (`this`) untouched for user data.

### Shoulds
It is usually useful to implement some of the following methods:

- static `idString` that can stringify a matchId
- method `verify` - if extra scoring restrictions are necessary
- method `progress` - if player propagation is necessary (tournaments with stages)
- method `limbo` - if a player can exist in limbo (waiting for a round to finish)
- method `early` - if a tournament can be done before all matches are played
- `initResult` - if extra properties for `stats` needs to be initialized

#### verify
Same as `verify` in the easier implementation, except it goes on the `prototype`.

#### progress
Same as `progress` in the easier implementation, except it goes on the `prototype`.

#### early
Same as `early` in the easier implementation, except it goes on the `prototype`.

#### limbo
Same as `limbo` in the easier implementation, except it goes on the `prototype`.

See the [FFA package](https://npmjs.org/package/ffa) for a full example of this.

#### stats
Same as `stats` in the easier implementation, except it goes on the `prototype`.

#### initResult
Same as `initResult` in the easier implementation, except it goes on the `prototype`.


### Remaining
Other `Base` methods MUST NOT be overridden to maintain expected behaviour.
