# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing data structures related to competitions. In particular it creates fair, round robin scheduled group stages, single & double elimination tournaments and FFA tournaments. It includes easy helper functions for scoring of matches, tracking players viewing ongoing statistics as well as provding the matches in a simple JSON format that completely serializes the tournament as far as this module is concerned.

## Usage
Create a new tournament object, then interact with helper functions to score and calculate results.

```js
var t = require('tournament');
var duel = new t.Duel(4, t.WB);

duel.matches; // in playable order
[ { id: { s: 1, r: 1, m: 1 }, // semi 1
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 }, // semi 2
    p: [ 3, 2 ] },
  { id: { s: 1, r: 2, m: 1 }, // grand final
    p: [ 0, 0 ] },
  { id: { s: 2, r: 1, m: 1 }, // bronze final
    p: [ 0, 0 ] } ]

duel.matches.forEach(function (m) {
  duel.score(m.id, [1, 0]);
});

// now winners are propagated and map scores are recorded
duel.matches;
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
duel.results();
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
```

## Creation
All matches for a tournament is created up front. In cases of elimination tournaments, not all players is known for the next round and is until that point filled in as the const placeholder `t.NA`.

### GroupStage
Group stage part of a tournament splits `n` players into `g` groups. If `n` is a multiple of the resulting group length and this length is even, then this splitting is done in such a way so that the sum of seeds is constant. Otherwise it will differ by up to the group length.

```js
var gs = new t.GroupStage(16, 4); // 16 players in groups of 4
```

At the end of a group stage, the results will be sorted in order of points, then map wins.

### Duel Elimination
Duel elimination tournaments consist of two players (or clans) per match. after each match the winner is advanced to the right in the bracket, and if loser brackt is in use, the loser is put in the loser bracket.

Duel tournaments can be of any size although perfect powers of 2 are the nicest. That said, the module will fill out the gaps with walkover markers that do not affect the scores in any way.
A walkover marker is indicated by the const `t.WO` in the `.p` player array.

```
javascript
var duel1 = new t.Duel(16, t.WB); // 16 players in single elimination
var duel2 = new t.Duel(16, t.LB); // 16 players in double elimination
```

A nice property of this duel tournament implementation is that if the seeding is perfect (i.e. if player a is seeded higher than player b, then player a wins) then the the top X in the results are also the top X seeded players. Player 1 will never meet player 2 in a single elimination quarter final for instance.

#### Short Variants
The default implementation of an elimination tournament includes one arguably controversial match in each case:

 * bronze final included in single elimination (last = t.WB)
 * double grand final in double elimination (last = t.LB)

By passing a truthy third value to the `Duel` constructor in their respective cases, this default behaviour can be overriden and the shorter versions (lacking the respective match) is used.

```js
var duel1 = new t.Duel(16, t.WB, true); // no bronze final in this
var duel2 = new t.Duel(16, t.LB, true); // winner of LB can win the grand final in one match
```

### FFA Elimination
FFA elimination tournaments consist of FFA matches that are bracketed like a duel elimination tournament. The only other main difference is that the number of players advancing can be greater than one.

```js
var ffa = new t.FFA(16, 4, 2); // 16 players in matches of 4, top 2 advancing
```

## Inspecting Matches
All tournament types have a `.matches` member that can be inspected and used for UI creation.
App-specific match information can be appended to this struct, but due to future version compatibility, it's recommended to put external information outside this structure.

Each element in the match array contain the following:

```js
ffa.matches[0]; // example first ffa match from the one above when scored
{ id: { s: 1, r: 1, m: 1 },
  p: [ 1, 5, 12, 16 ]
, m: [ 4, 3, 2, 1 ] }
```
The `m` property is the map scores (or match result in ffa) which exists only if the match is `.score()`d.

The `id` fully determines the position in the tournament.
The keys stand for `section` (bracket or group number), `round` number, `match` number.

The `.matches` array is sorted in by comparing first `s` then `r` then `m`. This means a Double elimination duel tournament would have WB matches listed first in order of rounds. Thus, they are listed like you would look at a typical printed bracket representation, down each round, one round right, repeat down then right, finally do next bracket similarly.

## Scoring
All tournament types, when instantiated have a `.score()` method. This always takes the `id` of the match and the array of map scores.

Say a match has 2 players, and the match score [2, 1] is given:

```js
var m = duel.matches[0]; // first match
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
```

In this case, `m.p[0]` is propagated to the next match and `m.p[1]` is knocked out, or carried to the loser bracket if in use

Because matches are sorted, you could even score them in a forEach loop without ever attempting to score a match that does not have all players assigned to it yet!

```js
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4, 3, 2, 1]); // score every match [4, 3, 2, 1] (here assumes 4 players per match)
});
```

### NB: Group Stages
Matches in a group stage allow individual match draws. If this is unsuited to your game/application, check for it.

### NB: FFA Tournaments
Matches in FFA tournaments only ensures it can discriminate between the last advancer and the first non-advancers. If these two scores are identical, the ambiguity is disallowed and `.score()` will prevent such a score being registered.

### NB: Duel Tournaments
If `.score()` is called with an `id` that's been scored ages ago, it's possible that the wrong winner appears two rounds later. To fix this, the next game must also be rescored so that the right winner is propagated again.

## Ensuring Consistency
The `.score()` method is a very raw interface. It modifies the matches array when possible, but will also *rewrite history* if asked, possibly causing an *inconsistent tournament state* when used with match ids that are too far back in the past.

For instance, in all elimination tournaments, if `.score()` is called with an `id` that's been scored 2 rounds before the current one, it's possible that the wrong winner appears in the current round because it was propagated earlier. Two fix this, the next game must also be rescored so that the right winner is propagated again.

To ensure that `.score()` is never called stupidly on invalid or archaic match ids, all tournaments have a built in an optional `.scorable()` method that takes a match `id` only and returns boolean of whether calling `.score()` on this `id` results in a safe update.

```js
var id = {s: 1, r: 2, m: 1}
if (duel.scorable(id)) {
  duel.score(id, score);
}
else {
  // will rewrite history - expose to administrators only
}
```

Note that `.scorable(id)` also verifies that `id` exists in the match array and the players are all ready to play this match (i.e. not from an elimination round that's too far in the future to have any players yet).

### NB: Group Stages
All matches are by default scorable for all group stages (that is, if they exist in `.matches` and has not already been scored).

However, if you want to ensure that matches are played in round order, you can pass in an optional second parameter to indicate that true round order should be obeyed. When using this security, `.scorable(id, true)` will return false when there exists games in earlier rounds in this group, that has not yet been played.

## Viewing Results
At any stage in a tournament, up to date results/statistics can be generated on demand. Every tournament type has a `.results()` method that will inspect its match array and calculate results for all players, and sort it based on (currently reached) placement

The results array contains as many players as the tournament was created with and the original seeding number is available in each object.

```js
var duel = new tournament.Duel(8, tournament.WB);
duel.matches.forEach(function (m) {
  duel.score(m.id, [2, 1]); // top player always proceeds
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

## Serializing Tournaments
Every tournament type is completely serializable via the `.matches` member, store that and you can recreate it via the static `.fromJSON()` function on each tournament constructor. Note that you need to remember what type of tournament it is still.

```js
var ms = duel.matches; // suppose we stored this in mongodb

var duel2 = t.Duel.fromJSON(ms);
// can now score duel2 like it was the original object
```

## UI Helpers
A variety of helper methods are built in so that you have to use tournament's datastructures as little as possible.

### Match Representation
Every tournament type has a `.representation()` method that takes an `id` of any match in the tournament. This will create a unique string representation for that match differing slightly depending on tournament type.

```js
duel.representation({s: t.LB, r: 2, m: 3});
"LB R2 M3"

ffa.representation({s: 1, r: 3, m: 2});
"R3 M2"

gs.representation({s: 5, r: 2, m: 1});
"G5 R5 M1"
```

### Upcoming Player Match
Every tournament allow getting the next match `id` for any player id (seed number) via the `.upcoming()` method. It will search the match array for the next unscored match with the given player id in it.

```js
var duel = new t.Duel(4, t.WB, true); // 4 player single elim without bronze final
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1); // 1 advanced to semi
{ s: 1, r: 2, m: 1}

duel.upcoming(4); // 4 was knocked out
undefined
```

#### NB: FFA Tournaments
If the round has not been fully completed yet, then this may return a partial id, like `{s: WB, r: 4}` missing a game number, as each round creates new seeds for a fair new round based on previous performance, and thus all the game results from this round are needed to determine a player's next game number. Note that such an id can still be represented via the `.representation()` method.


### Group Stage Algorithms
The meat of the group stage algorithms are exported separately as helper functions. These may perhaps mostly help the developer's intuition, but they could also be used to for visualizing how different parameters affect group stage generation.

The following examples show how they work:

```js
t.groups(15, 5); // 15 players in groups of 5
[ [ 1, 4, 7, 12, 15 ],
  [ 2, 5, 8, 11, 14 ],
  [ 3, 6, 9, 10, 13 ] ]

t.robin(4); // 4 player round robin pairups
[ [ [ 1, 4 ], [ 2, 3 ] ],   // round 1
  [ [ 1, 3 ], [ 4, 2 ] ],   // round 2
  [ [ 1, 2 ], [ 3, 4 ] ] ]  // round 3
```

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
