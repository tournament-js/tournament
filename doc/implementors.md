# Implementors guide

The simplest way to learn is to look at the simplest full implementation: [masters](https://github.com/clux/masters) - a sort of musical chairs style tournament, but this doc will explain all the details of implementing your own.

## Matches
You can create your own matches, but they MUST have the following format:

```js
{
  id: { s: Number, r: Number, m: Number},
  p: [Number],
  m: [Number] || undefined
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

Note that `match.id.toString()` **CAN** be overridden to customize how matches are represented in error messages.

## Tournament outline

```js
var Tournament = require('tournament');

// Specify tournament names and the named arguments for its constructor
var SomeTournament = Tournament.sub('SomeTournament', function (opts, initParent) {
  var matches = makeMatches(this.numPlayers, opts);
  initParent(matches); // goes to Tournament's constructor
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
    opts.someOption = Boolean(opts.someOption);
    return opts;
  }
});

// optional
SomeTournament.prototype._progress = function (match) {
  // TODO: deterministically propagate winners of match here if needed
};

SomeTournament.prototype._verify = function (id, score) {
  // TODO: check for extra conditions here if needed
  return null;
};

SomeTournament.prototype._early = function () {
  // TODO: return true here if tournament is done early
  return false;
};

SomeTournament.prototype._safe = function (match) {
  // TODO: return true if here this match in particular is safe to modify
  // without leaving the tournament in an inconsistent state
  return false;
};

SomeTournament.prototype._initResult = function (seed) {
  // TODO: initialize extra result properties here
  return {};
};

SomeTournament.prototype._stats = function (res, match) {
  // TODO: update results array of stats based on match here
  return res;
};

SomeTournament.prototype._sort = function (res) {
  // TODO: implement any extra sorting, positioning of res
  // that needs to happen after all the _stats calls have finished
  return res;
};

```

## Requirements

- `.sub` MUST be called with your init fn (constructor replacement)
- init function MUST call the `initParent` cb with the matches created
- `.configure` MUST be called providing an `invalid` entry
- Either `_stats` MUST be implemented OR `results` MUST be overridden
- `Tournament` methods MUST NOT be overridden to maintain expected behaviour

NB: For inheriting from another tournament, replace all references to `Tournament` with the tournament you are inheriting from.

To ensure you are not overriding anything, it is quick to just create a blank `Tournament` instance and check what methods exist.

### configure
Configure needs to be called with the rules and defaults for the options object.
It takes two functions; `defaults` and `invalid`, the first of which MUST exist.
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

`invalid` ensures that tournament rules are upheld. If you have specific rules, these will be guarded on for construction along with whatever invalid rules specified by the tournament class you are inheriting from. Note that we already verify that `numPlayers` is an integer for you.

`defaults` is there to help ensure that the `opts` object passed into `invalid` and the tournament constructor match what you'd expect.

#### default examples
You should try to set the default options in a sensible enough way so that you can construct a tournament without actually specifying the second argument at all. All currently compliant tournaments have sensible defaults:

- `new Duel(n)` -> single elimination tournament with bronze final
- `new GroupStage(n)` -> one group (league) tournament
- `new FFA(n)` -> one match FFA tournament with everyone in one match
- `new Masters(n)` -> musical chairs style knockout eliminating one per round

Check out the code for these tournaments for inspiration.

### results
The arguably most important feature of tournaments is the ability to figure out and to compute statistics and winners at the end. If you don't override it completely, you can implement up to three callbacks that help you structure this (usually) complicated function.

#### Overriding results
If you do this, you still need to make sure the results method follows the typical tournament conventions. Read the source of `tournament` and see how it expects results to be calculated, and read the following below to see what we expect from the different stages.

#### Implementing results via _stats, _sort and _initResult
The easiest way, which should work for most tournaments.

##### _initResult
Called in the beginning of when `results` is initializing the result objects. Most properties are already set in automatically in `Tournament.prototype.results`, but if you need custom statistical properties, initialize them here.

```js
SomeTournament.prototype._initResult = function (seed) {
  return {
    grp: this.groupFor(seed),
    losses: 0,
    draws: 0
  };
};
```

NB: This can be a constant function, as all properties are copied onto the results array.

##### _stats
Called after `_initResult` have been called `numPlayers` times and the array of results are called in. Fill in the statistics for your tournament here, and return the modified `resAry`

```js
SomeTournament.prototype._stats = function (resAry, m) {
  var winner = m.s[1] > m.s[0] ? m.p[1] : m.p[0];
  var w = Tournament.resultEntry(resAry, winner);
  w.wins += 1;
  w.pos += 1;
  return resAry
};
```

Modify any of the standard results properties (and extra one if you implemented `_initResult`). Note that if you manage to set the position `.pos` property perfectly based on this, you are done.

It is important to not set `.pos` higher than `numPlayers` before you can guarantee that the player will minimally attain this position from the current state.

##### _sort
If any positioning needs to be done after having computed all the `_stats`, you may do so here.

```js
SomeTournament.prototype._sort = function (resAry) {
  // see FFA._sort for an example of this
  return res.sort(comparisonFn);
};
```

At the end of the _stats function, you should ensure the `resAry` gets sorted by `pos` descending, then optionally by other properties such as group position, score sums wins or losses (`.for` and `.against`), and finally, with least priority, by `.seed` ascending.

Note Tournament helpers such as `Tournament.compareRes` and `Tournament.sorted` for computing statistics here. If your `_sort` implementation simply sorts res by `Tournament.compareRes` you do not need to implement it.

## Optional methods
It's often useful to supply the following methods

- `_verify` - if extra scoring restrictions are necessary
- `_progress` - if player propagation is necessary (tournaments with stages)
- `_safe` - if a match is safe to re-score without corrupting the tournament
- `_early` - if a tournament can be done before all matches are played


### _verify
Whenever a tournament gets asked to `.score()` a match, this gets called after some basic properties of value sanity is checked by the Tournament class.
If you implement this, verify only extra restrictions that you would like to put on scoring that is not already checked for by `Tournament.prototype.unscorable`.

```js
SomeTournament.prototype._verify = function (match, score) {
  if (score[0] === score[1]) {
    return "cannot draw"; // NOT OK
  }
  return null; // OK
};
```

The return value MUST be a failiure reason for the user, or NULL for OK.

### _progress
Whenever a match is scored successfully (all the `unscorable` - and, if exists, `_verify` - methods in the inheritance chain allowed the scoring to happen), `_progress` will be called with the newly scored match.

```js
SomeTournament.prototype._progress: function (match) {
  var next = this.findMatch({ s: 1, r: match.id.r + 1, m: 1 });
  if (next) {
    next.p = Tournament.sorted(match).slice(0, 2); // top 2 advance
  }
};
```

Due to the way Tournaments are usually serialized (by recording successful score calls), this function must progress deterministically, i.e. two calls with the same parameters must always do the same thing.

If something goes wrong in this method, throw an error.

### _safe
Typically, `unscorable` without the extra `allowPast` parameter will not allow you to re-score any matches that already have a score associated with them. This is to ensure the tournament is never left in an inconsistent state.

This could happen in, Duel style playoffs (say), where the finals have been scored, but one of the semis are re-scored to change the outcome. This would render the match history for the final as questionable as a different finalist could have been moved to the final after the final has been scored.

If the scoring administrator knows what he is doing, then allowing re-scoring is fine, as long as the state is cleaned up afterwards. However, it is better to not `allowPast` rescoring and instead have `_safe` implemented so that re-scoring is only allowed when it does not affect the future.

```js
SomeTournament.prototype._safe = function (match) {
  var next = this.findMatch({ s: 1, r: match.id.r + 1, m: 1 });
  return next && !Array.isArray(next.m); // safe iff next NOT played
};
```

### _early
Called when `isDone` is called and there are still matches remaining. If you implement this, you can decide if the tournament is done early, even if there are more matches to be played.

```js
SomeTournament.prototype._early = function () {
  // Double elimination Duel can be done early if GF game 1 is won by WB player
  var gf1 = this.matches[this.matches.length - 2];
  return this.isLong && this.last === LB && gf1.m && gf1.m[0] > gf1.m[1];
};
```

#### NB: Inheritance
If you implement one of the above, and inherit from another tournament that implements the same method, then you SHOULD call the method you are inheriting from:

```js
var Inherited = SuperClass.sub('Inherited', function (opts, initParent) {
  // own configuration here
  initParent(superClassOpts);
});
Inherited.configure({
  defaults: ownDefaultsFn, // only if necessary - SuperClass.defaults used automatically
  invalid: ownInvalidReasons, // only if necessary - SuperClass.invalid used automatically
});
Inherited.prototype._verify = function (match, score) {
  var reason = SuperClass.verify.call(this, match, score);
  if (reason) return reason;
  // verify other conditions here as usual
  return null;
};
Inherited.prototype._progress = function (match) {
  SuperClass.prototype._progress.call(this, match);
  // specific progression here as usual
};
Inherited.prototype._early = function () {
  SuperClass.prototype._early.call(this);
  // specific check here
};
Inherited.prototype._safe = function (match) {
  var superSafe = SuperClass.prototype._safe.call(this, match);
  // specific check here
};
Inherited.prototype._initResult = function (seed) {
  var res = SuperClass.prototype._initResult.call(this, seed);
  // specific extensions here
};
Inherited.prototype._stats = function (res, m) {
  var results = SuperClass.prototype._stats.call(this, res, m);
  // specific modifications to results here
};
Inherited.prototype._sort = function (res) {
  var results = SuperClass.prototype._sort.call(this, res);
  // specific calculations and sorting here
};
```

Note that if you are inheriting from another tournament, overriding these methods should only in rare cases be necessary.
