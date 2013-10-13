# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament) [![Dependency Status](https://david-dm.org/clux/tournament.png)](https://david-dm.org/clux/tournament)

Tournament is a pure library for managing the state and generating statistics for a collection of matches in a tournament. Tournaments are created up front and are mutated simply by scoring individual matches. State can be serialized/deserialized via a simple interface.

## Usage
Create a new tournament instance from one of the exposed classes, then interact with helper functions to score and calculate results.

```js
var t = require('tournament');
var d = new t.Duel(4, 1); // 4 players - single elimination

d.matches; // in playable order
[ { id: { s: 1, r: 1, m: 1 }, // semi 1
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 }, // semi 2
    p: [ 3, 2 ] },
  { id: { s: 1, r: 2, m: 1 }, // grand final
    p: [ 0, 0 ] },
  { id: { s: 2, r: 1, m: 1 }, // bronze final
    p: [ 0, 0 ] } ]

// let's pretend we scored these individually in a more realistic manner
d.matches.forEach(function (m) {
  d.score(m.id, [1, 0]);
});

// now winners are propagated and map scores are recorded
d.matches;
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ],
    m: [ 1, 0 ] },
  { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ],
    m: [ 1, 0 ] },
  { id: { s: 1, r: 2, m: 1 }, // 1 and 3 won their matches and play the final
    p: [ 1, 3 ],
    m: [ 1, 0 ] },
  { id: { s: 2, r: 1, m: 1 }, // 2 and 4 lost and play the bronze final
    p: [ 4, 2 ],
    m: [ 1, 0 ] } ]

// can view results at every stage of the tournament, here are the final ones
d.results();
[ { seed: 1,
    maps: 2,
    wins: 2,
    pos: 1 },
  { seed: 3,
    maps: 1,
    wins: 1,
    pos: 2 },
  { seed: 2,
    maps: 1,
    wins: 1,
    pos: 3 },
  { seed: 4,
    maps: 0,
    wins: 0,
    pos: 4 } ]

// can serialize via usual toString method, or implicitly:
var serialized = d + '';
t.parse(serialized) instanceof Duel;
true
```

## Tournament API
- [Duel Elimination](./doc/duel.md)
- [FFA Elimination](./doc/ffa.md)
- [KnockOut](./doc/knockout.md)
- [GroupStage](./doc/groupstage.md)
- [TieBreaker](./doc/tiebreaker.md) for GroupStage
- [Base](./doc/base.md)

## Inspecting Matches
All tournament types have a `.matches` member that can be inspected and used for UI creation.
App-specific match information can be appended to this struct, but for future version compatibility, ownership and modularity considerations, it's recommended to put external information outside this structure.

Each element in the match array contain the following:

```js
ffa.matches[0]; // example first ffa match from the one above when scored
{ id: { s: 1, r: 1, m: 1 },
  p: [ 1, 5, 12, 16 ]
, m: [ 4, 3, 2, 1 ] }
```
The `m` property is the map scores which exists only if the match is `.score()`'d.

The `p` property represents the seeds of the players in this match. Typically, you should store a map from external player ids to tournament seeds somewhere local to the tournament. Seeding is important as the most tournament types contain strong algorithms to balance matches early on, ensuring the most interesting ones come later on. Seeds are 1-indexed.

The `id` fully determines the position in the tournament.
The keys stand for `section` (bracket or group number), `round` number, `match` number.

The `.matches` array is sorted in by comparing first `s` then `r` then `m`. This means a Double elimination duel tournament would have WB matches listed first in order of rounds. Thus, they are listed like you would look at a typical printed bracket representation, down each round, one round right, repeat down then right, finally do next bracket similarly.

## Scoring
All tournament types, when instantiated have a `.score()` method. This always takes the `id` of the match and the array of scores. The match scores must have the same number of elements as the number of players in the match and they must (in general) be able to distinguish advancers from non-advancers (score returns false in the error cases)

Say a match has 2 players, and the match score [2, 1] is given:

```js
var m = duel.matches[0]; // first match of some duel tournament
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
```

In this case, `m.p[0]` is propagated to the next match and `m.p[1]` is knocked out, or carried to the loser bracket if in use.

Because matches are sorted, you could even score them in a forEach loop without ever attempting to score a match that does not have all players assigned to it yet.

```js
var ffa = new FFA(16, [4,4,4], [2,2])
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4, 3, 2, 1]); // score every match [4, 3, 2, 1]
});
```


## Viewing Results
At any stage in a tournament, up to date results/statistics can be generated on demand. Every tournament type has a `.results()` method that will inspect the match array and calculate results for all players, then sort it based on the placement.

```js
var duel = new t.Duel(8, 1);
duel.matches.forEach(function (m) {
  duel.score(m.id, [2, 1]); // upper player always proceeds
});
duel.results().slice(0, 4); // get top 4
[ { seed: 1,  // player 1 starts out in R1 M1 wins everything as always on top
    maps: 6,  // twice as many map wins as wins as 2 - 1 every score
    wins: 3,  // 8 players => won quarter, semi and final
    pos: 1 }, // position 1
  { seed: 3,
    maps: 5,
    wins: 2,
    pos: 2 },
  { seed: 5,
    maps: 5,
    wins: 2,
    pos: 3 }, // player 5 won bronze final
  { seed: 7,
    maps: 4,
    wins: 1,
    pos: 4 } ]
```

Results can be computed at any stage in a tournament. If called before `isDone()`, the position (`.pos`) will represent the current guaranteed to attain position in the tournament (if everything other match was lost).

## Serializing Tournaments
Every tournament type is completely serializable via the `.matches` member, store that and you can recreate it via the static `.fromJSON()` function on each tournament constructor. You only need to remember what type of tournament it is and, if used, the options object.

```js
var ms = duel.matches; // suppose we stored this in a database

var duel2 = t.Duel.fromJSON(ms);
// can now score duel2 like it was the original object
```

When using an options object (here with `FFA` limits):

```js
var ffaDb = new T.FFA(16, [4,4], [2], {limit: 4});
var ffa = T.FFA.fromJSON(ffaDb.matches, {limit: 4}); // now the same as ffaDb
```

## UI Helpers
A variety of helper methods are built in so that you have to use tournament's datastructures as little as possible.

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

### Upcoming Player Match
Every tournament allow getting the next match `id` for any player id (seed number) via the `.upcoming()` method. It will search the match array for the next unscored match with the given player seed number in it.

```js
var duel = new t.Duel(4, 1, {short: true}); // 4 player single elim without bronze final
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1); // 1 advanced to semi
{ s: 1, r: 2, m: 1}

duel.upcoming(4); // 4 was knocked out
undefined
```

## Multi-Stage Tournaments
Some manual support through `limit` and `GroupStage`-`TieBreaker` interaction. Follow the [multi-stage issue](https://github.com/clux/tournament/issues/1)

## Installation

```bash
$ npm install tournament
```

## Running tests
Install development dependencies

```bash
$ npm install
```

Run the tests

```bash
$ npm test
```

## License
MIT-Licensed. See LICENSE file for details.
