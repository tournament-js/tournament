# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament)

Tournament is a library for creating and managing data structures related to competitions. In particular it creates fair groups, round robin schedules, single & double elimination tournaments and FFA tournaments.

## Usage

````javascript
var T = require('tournament')
````

## General Helpers
#### T.groups(numPlayers, groupSize) :: [Group]
#### T.robin(numPlayers) :: [Round]

## Elimination Tournaments
### Helpers
#### ? T.byId(games) :: Game
#### T.representation(id) :: String
### Constants
#### T.WB :: Winner Bracket
#### T.LB :: Loser Bracket
#### T.WO :: Walk Over
#### T.NA :: Player Not Ready

### Duel Elimination
In this section, a parameter named

- `last` refer to the last bracket in play, either `T.WB` for _Single Elimination_ or `T.LB` for _Double Elimination_.
- `p` refer to the power of a tournament === ceil(log2(numPlayers))

#### T.duelElimination(last, numPlayers) :: [Game]
#### T.scoreDuel(last, p, games, id, score) :: Undefined
#### T.duelScorable(last, p, games, id) :: Boolean
#### T.duelResults(last, p, games) :: [Result]


### FFA Elimination
#### T.ffaElimination(numPlayers, groupSize, advancers) :: [Game]
#### T.scoreFfa(games, id, score) :: Undefined
#### T.ffaScorable(games, id) :: Boolean
#### T.ffaResults(numPlayers, games) :: [Result]


TODO: create `T.upcoming` to be nicer than `right`, `down` and work for all types.
I.e. it may not give an answer (in ffa tournaments), but will give the id of the next.
And it wont have to deal with `longLbGf`, and return UNDECIDED pre-round ffa scores.

### Alternative API
#### new T.FFA(numPlayers, groupSize, advancers) :: ffaObj
#### new T.FFA(games) :: ffaObj
#### ffa.score(id, mapScore)
#### ffa.results() :: [Result]
#### ffa.byId(id) :: Game
#### ffa.games() :: [Game]

#### T.Duel(lastBracket, numPlayers) :: duelObj
#### T.Duel(games) :: duelObj
#### duel.score(id, score)
#### duel.results() :: [Result]
#### duel.byId(id) :: Game
#### duel.games() :: [Game]

### Alternative API 3
Create an elimination object via either the FFA or the Duel constructor.

Need to store the constructor params regardless really, otherwise
info about the tournament would be lackluster. Would simplify some calculations
as well to have groupSize and advancers

#### T.FFA(numPlayers, groupSize, advancers)
#### T.FFA(games)
#### T.Duel(numPlayers, lastBracket)
#### T.Duel(games)

Then the following methods are available
#### t.score(id, mapScore) :: Undefined
Sets the given `mapScore` on the game with given `id` if it exists and is scorable.
#### t.scorable(id) :: Boolean
Returns whether or not the game with given `id` is currently scorable in `t`.
#### t.byId(id) :: Game
Fetches the game with given `id` in `t` if it exists. Otherwise returns `null`.
#### t.games() :: [Game]
Fetches all the games in `t` for external storage. Can be used to reconstruct a `Duel` or `FFA` instance directly.
#### t.results() :: [Result]
Fetches current result







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
