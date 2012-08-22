# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing data structures related to competitions. In particular it creates fair groups, round robin schedules, single & double elimination tournaments and FFA tournaments.

## Usage
Create a new tournament object, then interact with helper functions to score and calculate results.

````javascript
var tournament = require('tournament');
var duel = new tournament.Duel(4, tournament.WB);

duel.matches; // in playable order
// [ { id: { s: 1, r: 1, m: 1 },
//     p: [ 1, 4 ] },
//   { id: { s: 1, r: 1, m: 2 },
//     p: [ 3, 2 ] },
//   { id: { s: 1, r: 2, m: 1 },
//     p: [ 0, 0 ] } ]

duel.matches.forEach(function (m) {
  duel.score(m.id, [1, 0]);
});

// now winners are propagated and map scores are recorded
duel.matches;
// [ { id: { s: 1, r: 1, m: 1 },
//     p: [ 1, 4 ],
//     m: [ 1, 0 ] },
//   { id: { s: 1, r: 1, m: 2 },
//     p: [ 3, 2 ],
//     m: [ 1, 0 ] },
//   { id: { s: 1, r: 2, m: 1 },
//     p: [ 1, 3 ],
//     m: [ 1, 0 ] } ]

// can view results at every stage of the tournament, here are the final ones
duel.results();
// [ { seed: 1,
//     maps: 2,
//     wins: 2,
//     pos: 1 },
//   { seed: 3,
//     maps: 1,
//     wins: 1,
//     pos: 2 },
//   { seed: 2,
//     maps: 0,
//     wins: 0,
//     pos: 3 },
//   { seed: 4,
//     maps: 0,
//     wins: 0,
//     pos: 3 } ]
````


### API
TODO: document the types some here
#### T.representation(id) :: String
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
