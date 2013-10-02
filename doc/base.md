# Tournament :: Common Methods
All tournament types exported inherit from a common base class.
This class contains the matches and a bunch of helper functions for extracting data from the matches.

The matches can be inspected yourself, but you should not change the existing data structures on each match (`.m`, `.p` and `.id`) yourself, as to do so could corrupt the tournament.

In this document `d` refers to an instance of some `Base` subclass, i.e. either `Duel`, `FFA`, `GroupStage`, `TieBreaker`, or `KnockOut`.

## Identical Methods
### Match helpers
#### d::findMatch(id) :: Match
The normal helper to get a match from the matches array if it exists.

```js
var d = new t.Duel(4, t.WB);

d.findMatch({s:t.WB, r:1, m:1});
{ id: { s: 1, r: 1, m: 1 }, p: [ 1, 4 ] }

d.findMatch({s:t.LB, r:1, m:1});
undefined
```

#### d.findMatches(partialId) :: [Match]
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

#### d.findMatchesRanged(lowerPartialId, upperPartialId) :: [Match]
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

Incidentally this is the same as `d.findMatchesRanged({s:2})` as there are only 3 WB rounds in this tournament. Note you have to supply at least an object for the lower bounds (though it may be blank), but you can leave out the second argument altogether for `>=` on all lower bound properties.

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

#### currentRound([section]) :: round
Returns the first round from `d.rounds(section)` where some match is not yet scored.

#### nextRound([section]) :: round
Returns the first round after `d.currentRound(section)`.


### Advanced Partitioning Methods
The following two are advanced methods to partition the matches into an array of arrays of matches.

#### d.rounds([section]) :: [round1, round2, ...]
Partition the internal matches array into an array of rounds, optionally fixing `section`.

```js
var d = new t.Duel(4, t.LB);
d.rounds(t.WB); // all rounds in the winners bracket
[ [ { id: [Object], p: [Object] },
    { id: [Object], p: [Object] } ],
  [ { id: [Object], p: [Object] } ] ]


var gs = new t.GroupStage(16, 4);
gs.rounds(2)[0]; // first round in group 2
[ { id: { s: 2, r: 1, m: 1 },
    p: [ 2, 15 ] },
  { id: { s: 2, r: 1, m: 2 },
    p: [ 6, 11 ] } ]
```

#### sections([round]) :: [section1, section2, ...]
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


### Player Helpers
#### matchesFor(seed) :: [Match]
Returns all the matches that currently contain the player with given `seed`.
Can be used to track progress of a player.

```js
var d = new t.Duel(4, t.LB)
d.score({s:1, r:1, m:1}, [1, 0]); // 1 >> 4
d.score({s:1, r:1, m:2}, [0, 1]); // 3 << 2
d.score({s:1, r:2, m:1}, [1, 0]); // 1 >> 2

d.matchesFor(2);
[ { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ],
    m: [ 0, 1 ] },
  { id: { s: 1, r: 2, m: 1 },
    p: [ 1, 2 ],
    m: [ 1, 0 ] },
  { id: { s: 2, r: 2, m: 1 },
    p: [ 2, 0 ] } ]
// Note that player 2 is waiting in LB final
```

#### players(partialId) :: [seeds]
Returns all the unique players seed numbers found in the slice of the tournament with the partialId.
Equivalent to flattened, unique'd array of players plucked from `this.findMatches(partialId)`.

```
var gs = new t.GroupStage(16, 4);
gs.players({s:1}); // players in group 1
[1, 5, 12, 16]
```

#### resultsFor(seed) :: result entry
Equivalent to calling results() and then finding only the entry with `.seed` === `seed`.

## Overridden Methods
The behaviour of these methods change minimally between tournament types because they all call these methods.

#### d.upcoming(playerId) :: Match
Return the upcoming match for the next player if it exists.

#### d.unscorable(id, mapScore, allowPast) :: String || Null
Return the String reason why the match with the given `id` cannot be `score()`d with the current `mapScore`.

If scoring is safe, this function will return `null`. Always guard on this to ensure `score()` succeeds. If `score()` is attempted without this check, `score()` will simply log the error reason and not do the scoring.

#### d.isDone() :: Boolean
Returns whether or not the tournament is finished.

This usually means that all the matches have been played, `Duel` tournaments are the exception to this rule.

## Manually Implemented Methods
These methods are manually implemented in every sub class and the behaviour may change significantly between tournament types.

#### d.score(id, mapScore, allowPast) :: Boolean
Sets `mapScore` on the match (with given `id`) `.m` property provided `unscorable()` did not complain.
If `unscorable()` returns a String, this method will return `false` and log this string.
Otherwise, this method will return true, and update the match.

Depending on the tournament type, this may or may not trigger player propagation to later rounds/sections.

#### d.results() :: [Result]
Return the current minimally guaranteed results for each player in the tournament, sorted by current minimally attained position.

Depending on the tournament type, this may or may not be able to compute positions until the tournament is completely done.

Every result entry will at least contain:

```js
{
  pos: Number
  seed: Number,
  wins: Number
}
```

## Custom Data
If you want custom data stored on a match, the `data` keys is forever left free for you to set any data you want.

```js
d.matches[0].data = {
  names: {1 : 'clux', 4: 'pibbz'},
  ids: {1: 3454354, 4: 123123}
};
```
