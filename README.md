# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing match objects in extended competitive events. In particular it creates fair, round robin scheduled group stages, single & double elimination duel tournaments, FFA elimination tournaments and knockout tournaments. It includes easy helper functions for scoring of matches, tracking players viewing ongoing statistics as well as provding the matches in a simple JSON format that can be used to completely serialize the tournament and later deserialize it back.

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
All matches for a tournament is created up front. For most tournament types, not all players is known for the next round and is until that point filled in as the `const` placeholder `t.NA`.

### GroupStage
A group stage tournament splits `n` players into `g` groups. If `n` is a multiple of the resulting group length and this length is even, then this splitting is done in such a way so that the sum of seeds is constant across all groups. Otherwise it will differ by up to the group length. See [Group Stage Algorithms](#group-stage-algorithms).

```js
var gs = new t.GroupStage(16, 4); // 16 players in groups of 4
```

At the end of a group stage, the results will be sorted in order of points, then map wins.

### Duel Elimination
Duel elimination tournaments consist of two players / groups per match. after each match the winner is advanced to the right in the bracket, and if loser bracket is in use, the loser is put in the loser bracket.

Duel tournaments can be of any size although perfect powers of 2 are the nicest. That said, the module will fill out the gaps with walkover markers that do not affect the scores in any way.
A walkover marker is the `const` placeholder `t.WO` in the `.p` player array.

```js
var duel1 = new t.Duel(16, t.WB); // 16 players in single elimination
var duel2 = new t.Duel(16, t.LB); // 16 players in double elimination
var duel3 = new t.Duel(5, t.WB); // 5 player single elimination in an 8 player model
```

A nice property of this duel tournament implementation is that if the seeding is perfect (i.e. if player a is seeded higher than player b, then player a wins over player b) then the the top X in the results are also the top X seeded players. As an example, seed 1 can only meet seed 2 in the final in single elimination.

#### Short Variants
The _default_ implementation of an elimination tournament includes the usual (but sometimes controversial) extra match in each case:

 * bronze final in single elimination
 * double grand final in double elimination

Passing a `short:true` flag in the third options object to the `Duel` constructor will override the default behaviour and use the short variants.

```js
var ses = new t.Duel(16, t.WB, {short: true}); // no bronze final in this
var des = new t.Duel(16, t.LB, {short: true}); // winner of LB can win the grand final in one match
```

### FFA Elimination
FFA elimination tournaments consist of FFA matches that are bracketed like a duel elimination tournament. The only other main difference is that the number of players per match is greater than two and the number advancing per match advancing can be greater than one.

```js
var ffa = new t.FFA(16, [4, 4, 4], [2, 2]); // 16 players in matches of 4 each round, top 2 advances between each
```

You must specify precisely the required group size for each round and how many to advance.
This is really the hardest part of an FFA elimination. There are essentially endless possibilities, but we limit the most outragous ones so that it must at least be playable and non-trivial. The plan is to expose helpers to make this selection easiers on the UI side of things, but for now, be prepared to think about your parameters and check the tests for usage.

### Knockouts
Knockout tournaments consist of a pool of players, repeatedly fighting against each other and gradually reducing the number of players each round. We specify the number of players to knock out each round as an array of integers.

```js
var ko = new t.KnockOut(10, [3, 2, 2]);
```

This example will create a 10 player match in round 1, a 7 player match in round 2, a 5 player match in round 3, and a 3 player final.

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
var m = duel.matches[0]; // first match
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
```

In this case, `m.p[0]` is propagated to the next match and `m.p[1]` is knocked out, or carried to the loser bracket if in use.

Because matches are sorted, you could even score them in a forEach loop without ever attempting to score a match that does not have all players assigned to it yet!

```js
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4, 3, 2, 1]); // score every match [4, 3, 2, 1] (requires 4 players per match)
});
```

### NB: Group Stages
Matches in a group stage allow individual match draws. If this is unsuited to your game/application, check for it.

### NB: FFA Tournaments
Matches in FFA tournaments only ensures it can discriminate between the last advancer and the first non-advancers. If these two scores are identical, the ambiguity is disallowed and `.score()` will return false.

### NB: Duel Tournaments
Duel tournaments does not allow ties at any stage. It's meant to eliminate all but one, so do a best of 3 or overtime etc in the case of draws.

### NB: Knockouts
KnockOuts allow for ties everywhere except between the first knocked out player and the last advancing player. In the final, ties are fully allowed.

## Ensuring Scorability & Consistency
The `.score(id, scores)` method, whilst simple, has a couple of problems when used with the default behaviour:

1. When invalid `.score()` parameters are given, tournament will by default just log the error and return `false`. This is not very helpful if the action was taken remotely through a UI who will not see the message.

2. If the `.score()` parameter are valid, but it happened on an old match, it will rewrite history, and return `true`, possibly leaving the tournament in an inconsistent state.

The `.unscorable()` method addresses both of these problems in kind:

1. It reports the actual string logged by `.score()` if the scoring would be unsuccessful, allowing you to guard on it and report it back to the client instead of blindly trying.

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
va reason = duel.unscorable(id, score, true);
if (reason !== null) {
  console.log(reason); // parameters invalid in some way
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

Results can be computed at any stage in a tournament. If called before it's done, the position, or `pos`, will represent the current guaranteed to attain position in the tournament.

## Serializing Tournaments
Every tournament type is completely serializable via the `.matches` member, store that and you can recreate it via the static `.fromJSON()` function on each tournament constructor. You only need to remember what type of tournament it is.

```js
var ms = duel.matches; // suppose we stored this in a database

var duel2 = t.Duel.fromJSON(ms);
// can now score duel2 like it was the original object
```

NB: `fromJSON` does not accept stringified JSON.
Only what comes out of `.matches` goes back into `fromJSON()`.

NB: If the options object were passed to the respective tournament constructor then these must be passed verbatim to `fromJSON` as the second parameter.

```js
var ffaDb = new T.FFA(16, [4,4], [2], {limit: 4});
var ffa = T.FFA.fromJSON(ffaDb.matches, {limit: 4}); // now the same as ffaDb
```

## Ensuring Constructibility
Certain parameter configurations to tournament constructors are logically impossible. Like group size > number of players etc. Whether or not a set of parameters will fail contruction can be tested for with a method taking the same parameters as the respective constructor.

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
var duel = new t.Duel(4, t.WB, true); // 4 player single elim without bronze final
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1); // 1 advanced to semi
{ s: 1, r: 2, m: 1}

duel.upcoming(4); // 4 was knocked out
undefined
```

#### NB: FFA Tournaments
If the round has not been fully completed yet, then this may return a partial id, like `{s: WB, r: 4}` missing a game number, as each round creates new seeds for a fair new round based on previous performance, and thus all the game results from this round are needed to determine a player's next game number. Note that such an id can still be represented via the `.idString()` function.


### Group Stage Algorithms
The meat of the group stage algorithms are exported separately as helper functions. These may perhaps only help the developer's intuition, but they could also be used to for visualizing how different parameters affect group stage generation. Clever UI challenge accepted?

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

## Multi-Stage Tournaments
In development. Follow the [multi-stage issue](https://github.com/clux/tournament/issues/1)

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
