# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing data structures related to competitions. In particular it creates fair, round robin scheduled group stages, single & double elimination tournaments and FFA tournaments. It includes easy helper functions for scoring of matches, tracking players viewing ongoing statistics as well as provding the matches in a simple JSON format that completely serializes the tournament as far as this module is concerned.

## Usage
Create a new tournament object, then interact with helper functions to score and calculate results.

````javascript
var tournament = require('tournament');
var duel = new tournament.Duel(4, tournament.WB);

duel.matches; // in playable order
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ] },
  { id: { s: 1, r: 2, m: 1 },
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
  { id: { s: 1, r: 2, m: 1 },
    p: [ 1, 3 ],
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
    maps: 0,
    wins: 0,
    pos: 3 },
  { seed: 4,
    maps: 0,
    wins: 0,
    pos: 3 } ]
````

## Creation
### GroupStage
````javascript
var gs = new tournament.GroupStage(16, 4); // 16 players in groups of 4
````

### Duel Elimination
````
javascript
var duel1 = new tournament.Duel(16, tournament.WB); // 16 players in single elimination
var duel2 = new tournament.Duel(16, tournament.LB); // 16 players in double elimination
````

### FFA Elimination
````javascript
var ffa = new tournament.FFA(16, 4, 2); // 16 players in matches of 4, top 2 advancing
````

## Inspecting Matches
All tournament types have a `.matches` member that can be inspected and used for UI creation.
App-specific match information can be appended to this struct, but due to future version compatibility, it's recommended to put external information outside this structure.

Each element in the match array contain the following:

javascript
````
ffa.matches[0]; // example first ffa match
{ id: { s: 1, r: 1, m: 1 },
  p: [ 1, 5, 12, 16 ]
, m: [ 4, 3, 2, 1 ] }
````
The `m` property is the map scores (or match result in ffa) which exists only if the match is `.score()`d.

The `id` fully determines the position in the tournament.
The keys stand for `section` (bracket or group number), `round` number, `match` number.

The `.matches` array is sorted in by comparing first `s` then `r` then `m`. This means a Double elimination duel tournament would have WB matches listed first in order of rounds. Thus, they are listed like you would look at a typical printed bracket representation, down each round, one round right, repeat down then right, finally do next bracket similarly.

## Scoring
All tournament types, when instantiated have a `.score()` method. This always takes the `id` of the match and the array of map scores.

Say a match has 2 players, and the match score [2, 1] is given:

````javascript
var m = duel.matches[0]; // first match
duel.score(m.id, [2, 1]); // m.p[0] won 2 - 1 over m.p[1]
````

In this case, `m.p[0]` is propagated to the next match and `m.p[1]` is knocked out, or carried to the loser bracket if in use

Because matches are sorted, you could even score them in a forEach loop without ever attempting to score a match that does not have all players assigned to it yet!

````javascript
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4, 3, 2, 1]); // score every match [4, 3, 2, 1] (here assumes 4 players per match)
});
````

Note that in all but the GroupStage tournament type, the map score array can not contain all identical numbers, as ties are not allowed in elimination tournaments.

## Viewing Results
At any stage in a tournament, up to date results/statistics can be generated on demand. Every tournament type has a `.results()` method that will inspect its match array and calculate results for all players, and sort it based on (currently reached) placement

The results array contains as many players as the tournament was created with and the original seeding number is available in each object.

````javascript
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
    maps: 3,
    wins: 1,
    pos: 3 }, // 5 tied with 7 as both knocked out in semi TODO: bronze final
  { seed: 7,
    maps: 3,
    wins: 1,
    pos: 3 } ]
````

## Serializing Tournaments
Every tournament type is completely serializable via the `.matches` member, store that and you can recreate it via the static `.fromJSON()` function on each tournament constructor. Note that you need to remember what type of tournament it is still.

````javascript
var ms = duel.matches; // suppose we stored this in mongodb

var duel2 = tournament.Duel.fromJSON(ms);
// can now score duel2 like it was the original object
````

## UI Helpers
A variety of helper methods are built in so that you have to use tournament's datastructures as little as possible.

### Match Representation
Every tournament type has a `.representation()` method that takes an `id` of any match in the tournament. This will create a unique string representation for that match differing slightly depending on tournament type.

````javascript
duel.representation({s: tournament.LB, r: 2, m: 3});
"LB R2 M3"

ffa.representation({s: 1, r: 3, m: 2});
"R3 M2"

gs.representation({s: 5, r: 2, m: 1});
"G5 R5 M1"
````

### Upcoming Player Match
Every tournament allow getting the next match `id` for any player id (seed number) via the `.upcoming()` method. It will search the match array for the next unscored match with the given player id in it.

````javascript
var duel = new tournament.Duel(4, tournament.WB);
duel.score({ s: 1, r: 1, m: 1}, [1, 0]); // this match is player 1 vs. player 4

duel.upcoming(1);
{ s: 1, r: 2, m: 1}

duel.upcoming(4);
null
````


## NOTES
Ignore these. Docs will improve below.
### API

### Constants
#### T.WB :: Winner Bracket
#### T.LB :: Loser Bracket
#### T.WO :: Walk Over
#### T.NA :: Player Not Ready

### Duel Elimination
#### new T.Duel(numPlayers, lastBracket) :: duelTournament
#### duel.score(id, mapScore) :: Boolean
Updates the `duel.games` array and propagates the winner to the next game, and (if applicable) the loser to the lower bracket.

Note: if called with an `id` that's been scored ages ago, it's possible that the wrong winner appears two rounds later, so that the next game must also be rescored so that the right winner is propagated again.

#### duel.scorable(id) :: Boolean
Provides an extra safety check that `duel.score` will not leave the tournament in an inconsistent state described above.

#### duel.results() :: [Result]
Computes the results array for the current state of the tournament. Contains useful statistics like the final or currently obtained: placement, map wins and game wins.

### FFA Elimination
#### new T.FFA(numPlayers, groupSize, advancers) :: ffaTournament
#### ffa.score(id, mapScore) :: Boolean
Updates the `ffa.games` array and, if it's the last game of the round, the winners will be propagated to the next round.

TODO: maybe see if possible to propagate always

#### ffa.scorable(id [, trueRoundOrder]) :: Boolean
Will by default only validate if the given `id` exists in the instance's games list.
If `trueRoundOrder` is enabled, it will additionally verify that no games in this group have unscored games with strictly lower round numbers.

#### ffa.results() :: [Result]
Computes the results array for the current state of the tournament. Contains useful statistics like the final or currently obtained: placement, score sum and game wins.


### Group Stages
The basic algorithms for how group stages work. Generally, not necessary to use directly, but useful for intuition or if more control is required.
#### T.groups(numPlayers, groupSize) :: [Group]
#### T.robin(numPlayers [, playerArray]) :: [Round]

#### new T.GroupStage(numPlayers, groupSize) :: groupStage
#### group.score(id, mapScore) :: Boolean
#### group.scorable(id) :: Boolean
#### group.results() :: [Result]

### Tournament Serialization
Both tournament types are serializable directly via the `instance.games` array available on both types. Suppose the games have been stored elsewhere, to continue scoring hte tournament reload up the tournament instance via either:
#### T.FFA.fromGames(games) :: ffaTournament
#### T.Duel.fromGames(games) :: duelTournament
#### T.GroupStage.fromGames(games) :: groupStage

### Tracking Players
TODO:
#### tInst.upcoming(playerId) :: Maybe Id
Players can be tracked through the tournaments via this function. By allowing/forcing each player to score all ids returned by this function, the tournament will eventually finish by itself without the need for any more elaborate user interface.

Note that the if the round has not been fully completed yet in FFA tournaments, then this may return a partial id, like `{b: WB, r: 4}` missing a game number, as each round is reseeded to new fair rounds based on the current round results, and thus need all the game results from this round to determine a player's game number. Such an id can still be represented via `tInst.representation`.

#### tInst.representation(id) :: String
If the games array is used for printing to a UI, then the following
can be used to convert each game's `id` object to a unique string representation (differing slightly depending on tournament type).


## Installation

````bash
$ npm install tournament
````

## Running tests
Install development dependencies

````bash
$ npm install
````

Run the tests

````bash
$ npm test
````

## License
MIT-Licensed. See LICENSE file for details.
