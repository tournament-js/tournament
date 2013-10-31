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
var SomeTournament = Base.sub('SomeTournament', function (opts, initParent) {
  var matches = makeMatches(this.numPlayers, opts);
  initParent(matches); // goes to Base's constructor
});

SomeTournament.prototype.stats = function (res) {
  // TODO: fill in map based stats on res and sort res here
  return res;
};

SomeTournament.configure({
  invalid: function (numPlayers, opts) {
    if (numPlayers > 128) {
      return "128 players maximum"
    }
    return null;
  },
  // optional:
  defaults: function (numPlayers, opts) {
    opts.someOption = !!opts.someOption;
    return opts;
  },
});

// optional
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

```

### Requirements

- `.sub` MUST be called with your init fn (constructor replacement)
- init function MUST call the `initParent` cb with the matches created
- `.configure` MUST be called with `invalid` and MAYBE also `defaults` function(s)
- `stats` MUST be implemented
- `Base` methods MUST NOT be overridden to maintain expected behaviour

NB: For inheriting from another tournament, replace all references to `Base` with the tournament you are inheriting from.

To ensure you are not overriding anything, it is quick to just create a blank `Base` instance and check what methods exist.

#### configure
Configure needs to be called with the rules and defaults for the options object.
It takes two functions; `defaults` and `invalid`, the last of which MUST exist.
Both functions take the same arguments as the tournament constructor; `(numPlayers, opts)`.

```js
SomeTournament.configure({
  invalid: function (numPlayers, opts) {
    if (!np < 2) {
      return "number of players must be at least 2";
    }
    if (np > 64) {
      return "number of players cannot exceed 64"; // arbitrary limit
    }
    return null; // OK
  },
  defaults: function (numPlayers, opts) {
    opts.someOption = Array.isArray(opts.someOption) ? opts.someOption : [];
    return opts;
  }
});
```

`invalid` ensures that tournament rules are upheld. If you have specific rules, these will be guarded on for construction along with whatever invalid rules specified by the tournament or base class you are inheriting from. Note that we already verify that `numPlayers` is an integer for you.

`defaults` is there to help ensure that the `opts` object passed into `invalid` and the tournament constructor match what you'd expect.

##### default examples
You should try to set the default options in a sensible enough way so that you can construct a tournament without actually specifying the second argument at all. All currently compliant tournaments have sensible defaults:

- `new Duel(n)` -> single elimination tournament with bronze final
- `new GroupStage(n)` -> one group (league) tournament
- `new FFA(n)` -> one match FFA tournament with everyone in one match
- `new Masters(n)` -> musical chairs style knockout eliminating one per round

Check out the code for these tournaments for inspiration.

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

It is important to not set `.pos` higher than `numPlayers` before you can guarantee that the player will minimally attain this position from the current state.


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

This example was taken from the [FFA package](https://npmjs.org/package/ffa).

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
If you need to get the string of a tournament id and what `Base.idString` returns doesn't feel right, you should add your own `idString` function to `SomeTournament.idString` directly. Most tournaments do this.
