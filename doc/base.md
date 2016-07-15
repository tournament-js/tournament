# Tournament :: Commonalities
All tournament types follow a very simple principle. There is always only:

 - One tournament creation mechanism
 - One tournament mutator - `.score`
 - One common way of doing statistics/tracking progress

Each tournament implementation inherits from a common base class. A large amount of logic can be shared because only rules are different. This base class is exported for other tournament implementors, and is documented herein.

In this document:

- Example implementations `GroupStage`, `FFA` or `Duel` are referenced lightly
- The variable `trn` refers to an instance of one such implementation

# Base class

## Match methods
The entire matches array is available on `trn.matches`:

### trn.matches :: [Match]
Each element in the match array contain something like the following:

```js
var match = ffa.matches[0]; // example scored FFA match with 4 players
match;
{ id: { s: 1, r: 1, m: 1 },
  p: [ 1, 5, 12, 16 ] // these 4 seeds play
, m: [ 4, 3, 2, 1 ] } // these are their scores (in order of players above)
```

Note that:

- `Array.isArray(match.m)` if and only if `match` is `.score()`d
- `match.p` contains the array of players for this match
- `match` is ready to be played if and only if `trn.isPlayable(match)`
- `match.id` contains `s`, `r` and `m` properties for "section", "round" and "match"


The players array is their seed numbers. You need to store a map from external player ids to tournament seeds somewhere (maybe on each instance and/or match). Seeding is important as the most tournament types contain strong algorithms to balance matches early on, ensuring the most interesting ones come later on.

The full `.matches` array is sorted in by comparing first `s` then `r` if same section, finally by `m` if same round. This is usually the way tournaments are presented.

### trn.findMatch(id) :: Match
The normal helper to get a match from the matches array if it exists. Returns either a single match, or undefined.

```js
var d = new Duel(4);

d.findMatch({s:1, r:1, m:1});
{ id: { s: 1, r: 1, m: 1 }, p: [ 1, 4 ] }

d.findMatch({s:1, r:1, m:9});
undefined
```

### trn.isPlayable(match) :: Boolean
If all the players have been propagated into the players (`.p`) array, then the match is playable:

```js
var d = new Duel(4);
d.isPlayable(d.matches[0]); // first match gets prepared in immediately
true

d.isPlayable(d.findMatch({s:1, r:2, m:1})); // but round 2 is not ready until round 1 is scored
false
```

### trn.findMatches(idPartial) :: [Match]
Find all matches for which the set properties of a partial id match.

```js
var d = new Duel(4);
d.findMatches({s: 1, r:1}); // all WB matches in round 1
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ] } ]


var gs = new GroupStage(9, { groupSize: 3 });
gs.findMatches({s:1}) // group 1
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 4, 9 ] },
  { id: { s: 1, r: 2, m: 1 },
    p: [ 1, 9 ] },
  { id: { s: 1, r: 3, m: 1 },
    p: [ 1, 4 ] } ]
```

### trn.findMatchesRanged(lowerIdPartial, upperIdPartial) :: [Match]
Find all matches for which the set lower and upper properties of two partial ids match.

```js
var d = new Duel(8);
d.findMatchesRanged({r: 2}, {r: 3}) // get everything where  2 <= id.r <= 3
[ { id: { s: 1, r: 2, m: 1 },
    p: [ 0, 0 ] },
  { id: { s: 1, r: 2, m: 2 },
    p: [ 0, 0 ] },
  { id: { s: 1, r: 3, m: 1 },
    p: [ 0, 0 ] } ]
```

Incidentally this is the same as `trn.findMatchesRanged({s:2})` as there are only 3 WB rounds in this tournament. Note you have to supply at least an object for the lower bounds (though it may be blank), but you can leave out the second argument altogether for a `>=` check on all lower bound properties.

```
var gs = new GroupStage(9, { groupSize: 3 });
gs.findMatchesRanged({}, {s:2, r:1}); // round <=1 matches in group <=2
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 4, 9 ] },
  { id: { s: 2, r: 1, m: 1 },
    p: [ 5, 8 ] } ]
gs.findMatchesRanged({s:2}, {s:2, r:2}); // 1 <= round <= 2 matches in group 2
[ { id: { s: 2, r: 1, m: 1 },
    p: [ 5, 8 ] },
  { id: { s: 2, r: 2, m: 1 },
    p: [ 2, 8 ] } ]
```

### trn.currentRound([section]) :: round
Returns the first round from `trn.rounds(section)` where some match is not yet scored.

NB: `trn.currentRound()` may not return the same as `trn.currentRound(specifiedSection)` because one section may have come further than the other.

### trn.nextRound([section]) :: round
Returns the first round after `trn.currentRound(section)`.

NB: `trn.nextRound()` may not return the same as `trn.nextRound(specifiedSection)` because one section may have come further than the other.

### trn.matchesFor(seed) :: [Match]
Returns all the matches that currently contain the player with given `seed`.
Can be used to track progress of a player.

```js
var d = new Duel(4, { last: Duel.LB }); // double elimination
d.score({s:1, r:1, m:1}, [1, 0]); // 1 beat 4
d.score({s:1, r:1, m:2}, [0, 1]); // 3 beat 2
d.score({s:1, r:2, m:1}, [1, 0]); // 1 beat 2

d.matchesFor(2);
[ { id: { s: 1, r: 1, m: 2 }, p: [ 3, 2 ], m: [ 0, 1 ] },
  { id: { s: 1, r: 2, m: 1 }, p: [ 1, 2 ], m: [ 1, 0 ] },
  { id: { s: 2, r: 2, m: 1 }, p: [ 2, 0 ] } ]
// Note that player 2 is waiting in LB final
```

## Advanced match partitioning methods
The following two are advanced methods to partition the matches into an array of arrays of matches.

### trn.rounds([section]) :: [round1, round2, ...]
Partition the internal matches array into an array of rounds, optionally fixing `section`.

```js
var d = new Duel(4, { last: Duel.LB });
d.rounds(Duel.WB); // all rounds in the winners bracket
[ [ { id: { s: 1, r: 1, m: 1 }, p: [ 1, 4 ] },
    { id: { s: 1, r: 1, m: 2 }, p: [ 3, 2 ] } ],
  [ { id: { s: 1, r: 1, m: 2 }, p: [ 0, 0 ] } ] ]


var gs = new GroupStage(16, { groupSize: 4 });
gs.rounds(2)[0]; // first round in group 2
[ { id: { s: 2, r: 1, m: 1 }, p: [ 2, 15 ] },
  { id: { s: 2, r: 1, m: 2 }, p: [ 6, 11 ] } ]
```

### trn.sections([round]) :: [section1, section2, ...]
Partition the internal matches array into an array of sections, optionally fixing `round`.

```js
var d = new Duel(4, { last: Duel.LB });
var brackets = d.sections();
deepEqual(brackets[0], d.findMatches({s:1}));
deepEqual(brackets[1], d.findMatches({s:2}));

var gs = new GroupStage(9, { groupSize: 3 });
gs.sections(1); // all round one matches partitioned by group
[ [ { id: { s: 1, r: 1, m: 1 }, p: [4, 9] } ],
  [ { id: { s: 2, r: 1, m: 1 }, p: [5, 8] } ],
  [ { id: { s: 3, r: 1, m: 1 }, p: [6, 7] } ] ]
```


## Player methods
### trn.players(idPartial) :: [seeds]
Returns all the unique players seed numbers found in the slice of the tournament with the partial id.
Equivalent to flattened, unique'd array of players plucked from `this.findMatches(idPartial)`.

```
var gs = new GroupStage(16, { groupSize: 4 });
gs.players({s:1}); // players in group 1
[1, 5, 12, 16]
```

### trn.results() :: [Result]
Return the current minimally guaranteed results for each player in the tournament, sorted by current minimally attained position.

Results can be generated at any stage in a tournament. If called before `trn.isDone()`, the position (`.pos`) will represent the current guaranteed to attain position in the tournament (if everything other match was lost).

Every result entry will minimally contain:

```js
{
  pos: Number
  seed: Number,
  wins: Number,
  for: Number,
  against: Number
}
```

But most tournament types will contain a good number of extra statistical properties.

#### Example
```js
var duel = new Duel(8);
duel.matches.forEach(function (m) {
  duel.score(m.id, [2, 1]); // upper player always proceeds and gets 2 to 1 map points
});
duel.results().slice(0, 4); // get top 4
[ { seed: 1, maps: 6, wins: 3, pos: 1 }, // player 1 wins everything always on top
  { seed: 3, maps: 5, wins: 2, pos: 2 },
  { seed: 5, maps: 5, wins: 2, pos: 3 }, // player 5 won bronze final
  { seed: 7, maps: 4, wins: 1, pos: 4 } ]
```

### trn.resultsFor(seed) :: result entry
Get the results for just a single player in the tournament.

### trn.upcoming(playerId) :: [Match]
Return the upcoming matches for a given player

```js
var duel = new Duel(4, { short: true }); // single elimination without bronze final
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1); // 1 advanced to semi
[ { id: { s: 1, r: 2, m: 1 }, p: [ 1, 0 ] } ]

duel.upcoming(4); // 4 was knocked out
[]
```

## Progress methods
### trn.score(matchId, mapScore) :: Boolean
The *only* way to move the tournament along. Sets `mapScore` on the match's `.m` property, provided `unscorable()` did not complain.
If `trn.unscorable()` returns a String, this method will return `false` and log this string.
Otherwise, this method will return true, and update the match.

Depending on the tournament type, this may or may not trigger player propagation to later rounds/sections. Note that the `mapScore` is an array that is expected to zip with the players array in that match:

```js
var m = duel.matches[0]; // first match of some duel tournament
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
```

### trn.unscorable(matchId, mapScore, allowPast) :: String || Null
Return the String reason why the match with the given `matchId` cannot be `score()`d with the current `mapScore`.

If scoring is safe, this function will return `null`. Always guard on this to ensure `trn.score()` succeeds. If `score()` is attempted without this check, `trn.score()` will simply log the error reason and not do the scoring.

### trn.isDone() :: Boolean
Returns whether or not the tournament is finished.

Usually this means all the matches have been played (not always necessary).

# Common conventions

## Ensuring Scorability & Consistency
The `trn.score(id, scores)` method, is simple, but may exhibit surprising behaviour for the uninitiated:

1. When invalid `trn.score()` parameters are given, tournament will by default just log the error and return `false`. This is not very helpful if the action was taken remotely through a UI who will not see the message.

2. If the `trn.score()` parameter are valid, but it happened on an old match, it will rewrite history, and return `true`, possibly leaving the tournament in an inconsistent state.

The `trn.unscorable()` method addresses both of these problems in kind:

1. It reports the actual string logged by `.score()` if the scoring would be unsuccessful, allowing you to guard on it and report it back to the client instead of blindly trying.

2. It also by default disallows rewriting history, unless you pass in an optional last parameter to explicitly allow this.


```js
// default user access
var id = {s: 1, r: 2, m: 1}
var reason = trn.unscorable(id, score);
if (reason !== null) {
  console.log(reason); // either invalid parameters or complaining about rewriting history
}
else {
  trn.score(id, score); // will work, and will not rewrite history
}

// administrator access - can rewrite history
var reason = trn.unscorable(id, score, true); // 3rd param true for rewrite access
if (reason !== null) {
  console.log(reason); // parameters invalid in some normal way
}
else {
  trn.score(id, score); // will work, but may rewrite history.
}
```

 When guarding on `!trn.unscorable()` like this `tournament` will never log anything during a `trn.score()` call as they will always work.

 The unscorable reasons are hardcoded inside the the base class and implementations internal `_verify` functions. Typical faults include:

 - parameters not integers, scores not an array of numbers
 - scores not the same length as the player array
 - scores cannot distinguish between the top X player that are advancing (if eliminating match)
 - players are not ready in the match (dependent match not played)
 - match so far back in the past it would change history (unless allowPast)

## Ensuring Constructibility
Certain parameter configurations to tournament constructors are logically impossible. Like group size > number of players etc. Whether or not a set of parameters will fail contruction can be tested for with a method taking the same parameters as its respective constructor.

This is particularly valuable for the `FFA` elimination type where the possibilities are basically endless.

```js
// construct if valid:
var reason = FFA.invalid(numPlayers, opts);
if (!reason) {
  // tournament valid - and can be constructed with the parameters just passed in
  return new FFA(numPlayers, opts);
}
else {
  console.log(reason); // will tell you what went wrong
  return false;
}
```

## UI Helpers
### Match Representation
Most tournaments implement their own `toString()` for a match id. This will create a unique string representation for that match differing slightly depending on tournament type.

```js
duel.matches[0].id; // { s: 1, r: 1, m: 1 }
duel.matches[0].id + '' // 'WB R1 M1'

ffa.matches[5].id; // { s: 1, r: 3, m: 2 }
ffa.matches[5].id + ''; // 'R3 M2'

gs.matches[10].id; // { s: 5, r: 2, m: 1 }
gs.matches[10].id + ''; // 'G5 R5 M1'

masters.matches[2].id; // { s: 1, r:2, m: 1 }
masters.matches[2].id + ''; // 'R2'
```

## Serialization
Every tournament instance has a `.state` array that represents the canonical state of the class. If you store the arguments used to create the tournament along with this state - i.e. the triple (numPlayers, opts, state) - you can use the `.restore` function to recreate an instance from the state.

```js
// create a Duel tournament
var duel = new Duel(16, { last: Duel.LB });
// then suppose you  maybe scored duel so that the state isn't blank

var data = { numPlayers: 16, options: { last: Duel.WB }, state: inst.state.slice() };
// then store data in database

// recreate from data:
var duel2 = Duel.restore(data.numPlayers, data.options, data.state);
```

Note that two additional properties are recommended to store:

- `name` of the tournament should be stored (in case you want to use more than one tournament type)
- `version` of the tournament implementation's package (if you want to be able to upgrade safely)

### Serializing Metadata
Tournament is not designed for anything but the core progression mechanics, so if you need sport/game specific logic, it's typically better to build on top of tournament.

Since this is a common endeavor, the `data` key on each match is reserved, and tournament comes with some methods to help serialize any extra state you wish to attach to a match object.

```js
// create a Duel tournament
var duel = new Duel(16, { last: Duel.LB });

duel.matches.slice(0, 5).forEach(function (m) {
  if (duel.score(m.id, [1,0])) {
    m.data = { my: 'customData' }; // save some data on the match
  }
})

// All necessary info can be retrieved, as above, but with an extra call:
var data = {
  numPlayers: 16,
  options: { last: Duel.WB },
  state: inst.state.slice(),
  metadata: inst.metadata()
};
// you can store data in database safely

// and recreate later from data as above, but pass in metadata as well:
var duel2 = Duel.restore(data.numPlayers, data.options, data.state, data.metadata);
```

Note that you are fully responsible for sanity checking this data. You may wish to ensure you only write to a match's `data` key if the scoring succeeds, but this depends on what you are building. This is where tournament's responsibility ends.

## Multi-Stage Tournaments
Multi-staged tournaments can be created by using `Klass.from(instance, numProgressors)` that is built in on every `Tournament` subclass when using `Tournament.sub` or `Tournament.inherit`.

```
var ffa = new FFA(16, { sizes: [4], limit: 8 });
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4,3,2,1]);
});

var duel = Duel.from(ffa, 8); // duel is an 8 player tournament with top 8
```

Note that in this case we can safely pick top 8 because `FFA` implements limits. In many cases, [tiebreaking](https://npmjs.org/package/tiebreaker) may be required as an intermediate layer between tournaments.
