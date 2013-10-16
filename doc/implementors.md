# Implementors guide

The simplest way to learn is to look at the simplest full implementation: [masters](https://github.com/clux/masters) - a sort of musical chairs style tournament, but this doc will explain all the details of implementing your own.

## Matches
You must create your own matches, but they MUST have the following format:

```js
{
  id: { s: Number, r: Number, m: Number},
  p: [Number],
  m: [Number]
}
```

With the following restrictions:

 - All numbers MUST be 1-indexed integers
 - `.p` is the array of seeding numbers represetning player ids for this library
 - At least one of the `id` properties MUST exist
 - The `.data` key on the match must be reserved for users
 - The `.m` key on match MUST not be set on construction
 - The `.m` key on match MUST only be touched by `.score`
 - A match `id` is always unique
 - If we sort the match id by `s` difference, then `r` difference, then `m` difference, we can score all the matches in this order

The `id` key omissions rule more specifically means you can do (at most) two of the following for all matches:

 - If your tournament has only one "section", you MAY omit the `.s` key on `id`
 - If your tournament has only one "round", you MAY omit the `.r` key on `id`
 - If your tournament has only one "match" per round, you MAY omit the `.m`. key on `id`

But when dropping attributes, you should try to preserve the convention that:

 - Equal `.r` properties (same round) can be played simultaneously (at least within a section)
 - No player should be active in different `.s` (sections) at the *same time*

## Tournament outline
This is the minimal amount of code you have to write:

```js
var Base = require('tournament');

function SomeTournament(numPlayers, opts) {
  if (!(this instanceof SomeTournament)) {
    return new someTournament(numPlayers, opts); // new protection
  }
  // TODO: somehow create matches and guard on SomeTournament.invalid
  var matches = [];
  Base.call(this, SomeTournament, matches);
}

// inherit from Base
SomeTournament.prototype = Object.create(Base.prototype);

// statics
SomeTournament.parse = Base.parse.bind(null, SomeTournament);
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

module.exports = SomeTournament;
```

## Requirements
Like in the outline, you MUST implement:

- constructor that calls the `Base` class constructor with the matches
- static `parse` that defers to `Base`
- static `idString` that can stringify a matchId
- static `invalid` that can give a string reason why tournament options are invalid
- method `results` to compute statistics/progression

The latter is always the hard one

## Shoulds
It usually useful to implement some of the following methods

- method `unscorable` - if extra scoring restrictions are necessary
- method `score` - if player propagation is necessary (tournaments with stages)
- method `isDone` - if a tournament can be done before all matches are played

## unscorable

    If you implement `unscorable`, you MUST call the Base implementation

This can be achieved in the following way:

```js
SomeTournament.prototype.unscorable = function (id, score, allowPast) {
  var invReason = Base.prototype.unscorable.call(this, id, score, allowPast);
  if (invReason != null) {
    return invReason;
  }
  var m = this.findMatch(id);
  // if extra conditions fail return a string explaining why

  // otherwise, indicate scorable by returning null
  return null;
};
```

## score

    If you implement `score`, you MUST call the Base implementation

The Base implementation simply guards on `!unscorable` and returns a Boolean indicating whether or not this succeeded.


```js
SomeTournament.prototype.score = function (id, score) {
  if (Base.prototype.score.call(this, id, score) {
    // Do player propagation here
    return true;
  }
  return false;
};
```

## upcoming
If a tournament needs to wait for a round before propagating, you SHOULD implement a better `upcoming` that accounts for this.

```js
SomeTournament.prototype.upcoming = function (playerId) {
  var id = Base.prototype.upcoming.call(this, playerId);
  if (id) {
    return id; // player not waiting for new rounds - match ready
  }
  // otherwise, COULD check if player is due to reach the next round and return a partial id
};
```

See the [FFA package](https://npmjs.org/package/ffa) for a full example of this.

## Remaining
Other `Base` methods MUST NOT be overridden to maintain expected behaviour.
