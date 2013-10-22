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

With the following requirements:

 - All numbers MUST be 1-indexed integers
 - `.p` MUST be the array of seeding numbers representning players
 - All of the above `id` properties (`s`, `r`, and `m`) MUST exist even if some of them are identical for all matches
 - The `.data` key on the match MUST be reserved for users
 - The `.m` key on match MUST NOT be set on construction
 - The `.m` key on match MUST only be touched by `.score`
 - Every match `id` MUST always be unique
 - If we sort the match id by `s` difference, then `r` difference, then `m` difference, we can score all the matches in this order

## Tournament outline - easy way

```js
var Base = require('tournament');

// Specify tournament names and the named arguments for its constructor
Base.sub('SomeTournament', ['numPlayers', 'opts'], {
  init: function (initParent) {
    var matches = makeMatches(this.numPlayers, this.opts);
    initParent(matches); // goes to Base's constructor
  },

  progress: function (match) {
    // TODO: propagate winners of match here if needed
  },
  unscorable: function (id, score) {
    // TODO: check for extra conditions here if needed
    return null;
  },
  upcoming: function (playerId) {
    // TODO: check if we can figure out roughly where the player is headed
  }

});

### Requirements

- `numPlayers` MUST exists as a named argument
- `init` MUST be implemented
- `init` MUST call the `initParent` cb with the arguments of `Base` (matches only)

NB: For inheriting from another tournament, replace all references to `Base` with the tournament you are inheriting from.

### Usefuls
It's often useful to supply the following methods

- `unscorable` - if extra scoring restrictions are necessary
- `progress` - if player propagation is necessary (tournaments with stages)
- `upcoming` - if a player exists in limbo before a round is done
- `isDone` - if a tournament can be done before all matches are played


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

NB: return a reason for the user, or NULL for OK.

#### progress
Whenever a match is scored successfully (all the `unscorable` methods in the inheritance chain allowed the scoring to happen), `progress` will be called with the newly scored match.

```js
  progress: function (match) {
    var next = this.findMatch({ s: 1, r: match.id.r + 1, m: 1 });
    if (next) {
      next.p = Base.sorted(match).slice(0, 2); // top 2 advance
    }
  }
```

If something goes wrong in this method, throw an error.

#### upcoming
Unlike the normal inheritance way, if this gets called, the inherited `upcoming` function failed. I.e. (if Base) no matches were found containing the playerId that have not yet been played. If there is a limbo stage (waiting for other matches to complete before the player advances), then check ONLY for this here.

```js
  upcoming: function (playerId) {
    // player may be waiting for generation of next round
    var m = $.firstBy(function (m) {
      return m.p.indexOf(playerId) >= 0 && m.m;
    }, this.currentRound() || []);

    // if he played this round, check if he will advance
    if (m && Base.sorted(m).slice(0, 2).indexOf(playerId) >= 0) {
      return {s: 1, r: m.id.r + 1}; // yes, was in top 2, return a partial id
    }
  }
```

#### isDone
TODO: how?

## Tournament outline - manual inheritance
If you prefer to have full control of your prototypes, you may inherit manually from the `Base` class. Note that as per expectations of implementations behaviour, you should follow this outline as closely as possible.

```js
var Base = require('tournament');

function SomeTournament(numPlayers, opts) {
  if (!(this instanceof SomeTournament)) {
    return new someTournament(numPlayers, opts); // new protection
  }
  this.numPlayers = numPlayers; // always store this
  // TODO: somehow create matches and guard on SomeTournament.invalid
  var matches = [];
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

module.exports = SomeTournament;
```

### Requirements
Like in the outline, you MUST implement:

- constructor that calls the `Base` class constructor with the matches
- static `parse` that defers to `Base`
- static `idString` that can stringify a matchId
- static `invalid` that can give a string reason why tournament options are invalid
- method `results` to compute statistics/progression

The latter is always the hard one.

Note that the constructor MUST set `numPlayers` on `this` as `Base` class helpers expects this variable.

Finally, you must leave the `data` key on the instance (`this`) untouched for user data.

### Shoulds
It usually useful to implement some of the following methods

- method `unscorable` - if extra scoring restrictions are necessary
- method `score` - if player propagation is necessary (tournaments with stages)
- method `isDone` - if a tournament can be done before all matches are played

#### unscorable

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

#### score

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

#### upcoming
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


### Remaining
Other `Base` methods MUST NOT be overridden to maintain expected behaviour.
