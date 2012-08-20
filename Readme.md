# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing data structures related to competitions. In particular it creates fair groups, round robin schedules, single & double elimination tournaments and FFA tournaments.

## Usage

````javascript
var T = require('tournament')
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

#### ffa.scorable(id) :: Boolean
Necessary here?

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
