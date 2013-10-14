# Tournament :: Commonalities
All tournament types follow a very simple principle. There is always only:

 - One tournament creation mechanism
 - One tournament mutator - `.score`
 - One common way of storing state
 - One common way of doing statistics/tracking progress

Each tournament implementation inherits from a common base class. A large amount of logic can be shared because only rules are different. This `Base` class is exported for other tournament implementors, and is documented herein.

In this document `d` refers to an instance of some `Base` subclass, i.e. `Duel`, `FFA`, `GroupStage`, `TieBreaker`, or `KnockOut`.

# Base class

    Stability: 2 - Unstable

## Match methods
The entire matches array is available on `d.matches`:

### d.matches :: [Match]
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
- `match.id` contains `s`, `r` and `m` properties for "section", "round" and "match"


The players array is their seed numbers. You need to store a map from external player ids to tournament seeds somewhere (maybe on each instance and/or match). Seeding is important as the most tournament types contain strong algorithms to balance matches early on, ensuring the most interesting ones come later on.

The full `.matches` array is sorted in by comparing first `s` then `r` then `m`. This means a Double elimination duel tournament would have WB matches listed first in order of rounds. Thus, they are listed like you would look at a typical printed bracket representation, down each round, one round right, repeat down then right, next bracket, repeat.

### d::findMatch(id) :: Match
The normal helper to get a match from the matches array if it exists. Returns either a single match, or undefined.

```js
var d = new t.Duel(4, t.WB);

d.findMatch({s:1, r:1, m:1});
{ id: { s: 1, r: 1, m: 1 }, p: [ 1, 4 ] }

d.findMatch({s:t.WB, r:1, m:9});
undefined
```

### d.findMatches(idPartial) :: [Match]
Find all matches for which the set properties of a partial id match.

```js
var d = new t.Duel(4, t.LB);
d.findMatches({s: 1, r:1}); // all WB matches in round 1
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ] } ]


var gs = new t.GroupStage(9, 3) // 9 players in groups of 3
gs.findMatches({s:1}) // group 1
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 4, 9 ] },
  { id: { s: 1, r: 2, m: 1 },
    p: [ 1, 9 ] },
  { id: { s: 1, r: 3, m: 1 },
    p: [ 1, 4 ] } ]
```

### d.findMatchesRanged(lowerIdPartial, upperIdPartial) :: [Match]
Find all matches for which the set lower and upper properties of two partial ids match.

```js
var d = new t.Duel(8, t.WB);
d.findMatchesRanged({r: 2}, {r: 3}) // get everything where  2 <= id.r <= 3
[ { id: { s: 1, r: 2, m: 1 },
    p: [ 0, 0 ] },
  { id: { s: 1, r: 2, m: 2 },
    p: [ 0, 0 ] },
  { id: { s: 1, r: 3, m: 1 },
    p: [ 0, 0 ] } ]
```

Incidentally this is the same as `d.findMatchesRanged({s:2})` as there are only 3 WB rounds in this tournament. Note you have to supply at least an object for the lower bounds (though it may be blank), but you can leave out the second argument altogether for a `>=` check on all lower bound properties.

```
var gs = new t.GroupStage(9, 3)
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

### currentRound([section]) :: round
Returns the first round from `d.rounds(section)` where some match is not yet scored.

NB: `d.currentRound()` may not return the same as `d.currentRound(specifiedSection)` because one section may have come further than the other.

### nextRound([section]) :: round
Returns the first round after `d.currentRound(section)`.

NB: `d.nextRound()` may not return the same as `d.nextRound(specifiedSection)` because one section may have come further than the other.

### d.matchesFor(seed) :: [Match]
Returns all the matches that currently contain the player with given `seed`.
Can be used to track progress of a player.

```js
var d = new t.Duel(4, t.LB)
d.score({s:1, r:1, m:1}, [1, 0]); // 1 >> 4
d.score({s:1, r:1, m:2}, [0, 1]); // 3 << 2
d.score({s:1, r:2, m:1}, [1, 0]); // 1 >> 2

d.matchesFor(2);
[ { id: { s: 1, r: 1, m: 2 }, p: [ 3, 2 ], m: [ 0, 1 ] },
  { id: { s: 1, r: 2, m: 1 }, p: [ 1, 2 ], m: [ 1, 0 ] },
  { id: { s: 2, r: 2, m: 1 }, p: [ 2, 0 ] } ]
// Note that player 2 is waiting in LB final
```

## Advanced match partitioning methods
The following two are advanced methods to partition the matches into an array of arrays of matches.

### d.rounds([section]) :: [round1, round2, ...]
Partition the internal matches array into an array of rounds, optionally fixing `section`.

```js
var d = new t.Duel(4, t.LB);
d.rounds(t.WB); // all rounds in the winners bracket
[ [ { id: { s: 1, r: 1, m: 1 }, p: [ 1, 4 ] },
    { id: { s: 1, r: 1, m: 2 }, p: [ 3, 2 ] } ],
  [ { id: { s: 1, r: 1, m: 2 }, p: [ 0, 0 ] } ] ]


var gs = new t.GroupStage(16, 4);
gs.rounds(2)[0]; // first round in group 2
[ { id: { s: 2, r: 1, m: 1 }, p: [ 2, 15 ] },
  { id: { s: 2, r: 1, m: 2 }, p: [ 6, 11 ] } ]
```

### d.sections([round]) :: [section1, section2, ...]
Partition the internal matches array into an array of sections, optionally fixing `round`.

```js
var d = new t.Duel(4, t.LB);
var brackets = d.sections();
deepEqual(brackets[0], d.findMatches({s:t.WB}));
deepEqual(brackets[1], d.findMatches({s:t.LB}));

var gs = new t.GroupStage(9, 3);
gs.sections(1); // all round one matches partitioned by group
[ [ { id: { s: 1, r: 1, m: 1 }, p: [4, 9] } ],
  [ { id: { s: 2, r: 1, m: 1 }, p: [5, 8] } ],
  [ { id: { s: 3, r: 1, m: 1 }, p: [6, 7] } ] ]
```


## Player methods
### d.players(idPartial) :: [seeds]
Returns all the unique players seed numbers found in the slice of the tournament with the partial id.
Equivalent to flattened, unique'd array of players plucked from `this.findMatches(idPartial)`.

```
var gs = new t.GroupStage(16, 4);
gs.players({s:1}); // players in group 1
[1, 5, 12, 16]
```

### d.results() :: [Result]
Return the current minimally guaranteed results for each player in the tournament, sorted by current minimally attained position.

Results can be generated at any stage in a tournament. If called before `d.isDone()`, the position (`.pos`) will represent the current guaranteed to attain position in the tournament (if everything other match was lost).

Every result entry will minimally contain:

```js
{
  pos: Number
  seed: Number,
  wins: Number
}
```

But most tournament types will contain a good number of extra statistical properties.

#### Example
```js
var duel = new t.Duel(8, 1);
duel.matches.forEach(function (m) {
  duel.score(m.id, [2, 1]); // upper player always proceeds and gets 2 to 1 map points
});
duel.results().slice(0, 4); // get top 4
[ { seed: 1, maps: 6, wins: 3, pos: 1 }, // player 1 wins everything always on top
  { seed: 3, maps: 5, wins: 2, pos: 2 },
  { seed: 5, maps: 5, wins: 2, pos: 3 }, // player 5 won bronze final
  { seed: 7, maps: 4, wins: 1, pos: 4 } ]
```

### d.resultsFor(seed) :: result entry
Get the results for just a single player in the tournament.

### d.upcoming(playerId) :: Match
Return the upcoming match for the next player if it exists.

```js
var duel = new t.Duel(4, 1, {short: true}); // 4 player single elim without bronze final
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1); // 1 advanced to semi
{ s: 1, r: 2, m: 1}

duel.upcoming(4); // 4 was knocked out
undefined
```

## Progress methods
### d.score(matchId, mapScore, allowPast) :: Boolean
The *only* way to move the tournament along. Sets `mapScore` on the match's `.m` property, provided `unscorable()` did not complain.
If `unscorable()` returns a String, this method will return `false` and log this string.
Otherwise, this method will return true, and update the match.

Depending on the tournament type, this may or may not trigger player propagation to later rounds/sections. Note that the `mapScore` is an array that is expected to zip with the players array in that match:

```js
var m = duel.matches[0]; // first match of some duel tournament
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
```

#### Note for implementors
This method SHOULD be manually implemented in the sub class with the same signature. If it is implemented, the `Base` implementation MUST NOT be called in the new implementation.

### d.unscorable(matchId, mapScore, allowPast) :: String || Null
Return the String reason why the match with the given `matchId` cannot be `score()`d with the current `mapScore`.

If scoring is safe, this function will return `null`. Always guard on this to ensure `score()` succeeds. If `score()` is attempted without this check, `score()` will simply log the error reason and not do the scoring.

#### Note for implementors
This method SHOULD be implemented manually. If it is implemented, the `Base` implementation MUST be called first in the new implementation.

### d.isDone() :: Boolean
Returns whether or not the tournament is finished.

This usually means that all the matches have been played (`Duel` tournaments are the exception to this rule).


# Common conventions
## Custom data
### Match data
If you want custom data stored on a match, the `data` keys is forever left free for you to set any data you want.

```js
// ex: want to store the names and profile ids associated with the seeds on the match itself
d.matches[0].data = {
  names: {1 : 'clux', 4: 'pibbz'},
  ids: {1: 3454354, 4: 123123}
};
```

### Tournament data
More global custom data can be stored on the tournament instance directly under the reserved `data` key.

```js
var d = new t.Duel(4, t.WB);
d.data = {
  players: { 'clux': 1, 'Thhethssmuz': 2, 'e114': 3, 'pibbz': 4 }
};
// when serializing the tournament this is now saved
```

## Ensuring Scorability & Consistency
The `.score(id, scores)` method, whilst simple, has a couple of problems when used with the default behaviour:

1. When invalid `.score()` parameters are given, tournament will by default just log the error and return `false`. This is not very helpful if the action was taken remotely through a UI who will not see the message.

2. If the `.score()` parameter are valid, but it happened on an old match, it will rewrite history, and return `true`, possibly leaving the tournament in an inconsistent state.

The `.unscorable()` method addresses both of these problems in kind:

1. It reports the actual string logged by `.score()` if the scoring would be unsuccessful, allowing you to guarddd on it and report it back to the client instead of blindly trying.

2. It also by default disallows rewriting history, unless you pass in an optional last parameter to explicitly allow this.


```js
// default user access
var id = {s: 1, r: 2, m: 1}
var reason = duel.unscorable(id, score);
if (reason !== null) {
  console.log(reason); // either invalid parameters or complaining about rewriting history
}
else {
  duel.score(id, score); // will work, and will not  rewrite history
}

// administrator access - can rewrite history
var reason = duel.unscorable(id, score, true); // 3rd param true for rewrite access
if (reason !== null) {
  console.log(reason); // parameters invalid in some normal way
}
else {
  duel.score(id, score); // will work, but may rewrite history.
}
```

 When guarding on `!unscorable` like this `tournament` will never log anything during a `.score()` call as they will always work.

 The reasons are currently hardcoded inside each tournament types dedicated file, under their internal `unscorable` function. Typical faults include:

 - parameters not integers, scores not an array of numbers
 - scores not the same length as the player array
 - scores cannot distinguish between the top X player that are advancing (if eliminating match)
 - players are not ready in the match (dependent match not played)

But they do not cover the the stricter reasons listed in the NBs above!

## Ensuring Constructibility
Certain parameter configurations to tournament constructors are logically impossible. Like group size > number of players etc. Whether or not a set of parameters will fail contruction can be tested for with a method taking the same parameters as its respective constructor.

This is particularly valuable for the `FFA` elimination type where the possibilities are basically endless.

```js
// construct if valid:
var reason = t.FFA.invalid(numPlayers, grsAry, advAry, opts);
if (!reason) {
  // tournament valid - and can be constructed with the parameters just passed in
  return new t.FFA(numPlayers, grsAry, advAry, opts);
}
else {
  console.log(reason); // will tell you what went wrong
  return false;
}
```

## UI Helpers
### Match Representation
Every tournament type has a static `.idString()` method that takes an `id` of any match in a tournament. This will create a unique string representation for that match differing slightly depending on tournament type.

```js
t.Duel.idString({s: t.LB, r: 2, m: 3});
"LB R2 M3"

t.FFA.idString({s: 1, r: 3, m: 2});
"R3 M2"

t.GroupStage.idString({s: 5, r: 2, m: 1});
"G5 R5 M1"

t.KnockOut.idString({s: 1, r:2, m: 1});
"R2"
```

#### Note for implementors
This function MUST be implemented and placed on the constructor's `idString` property.


## Serialization
TODO: explain new method


## Multi-Stage Tournaments
Some manual support through `limit` and `GroupStage`-`TieBreaker` interaction. Follow the [multi-stage issue](https://github.com/clux/tournament/issues/1)
