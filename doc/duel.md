# Duel tournaments

    Stability: 3 - Stable

## Overview
Duel elimination tournaments consist of two players / teams per match. after each match the winner is advanced to the right in the bracket, and if loser bracket is in use, the loser is put in the loser bracket.

Duel tournaments can be of any size although perfect powers of 2 are the nicest because they are perfectly balanced. That said, the module will fill out the gaps with walkover markers (`-1`) and will run an unbalanced tournament in the fairest possible way. Unbalanced tournaments typically benefits the highest seeds as these are the players receiving walk-overs in the first round.

A nice property of this duel tournament implementation is that if the seeding is perfect (i.e. if player a is seeded higher than player b, then player a wins over player b) then the top X in the results are also the top X seeded players. As an example, seed 1 can only meet seed 2 in the final in single elimination.

### In this doc
For readibility and convenience:

- `WB` := `Duel.WB` := `1`
- `LB` := `Duel.LB` := `2`

## Construction
Specify the number of players and the last bracket, and a third optional options object.

```js
// 4 players - double elimination
var duel1 = new Duel(4, LB, opts);

// 5 players - single elimination (8 player model)
var duel3 = new Duel(5, WB);
```

The `Duel.invalid(numPlayers, lastBracket, opts)` will tell you whether the constructor arguments produce a valid tournament. Read its entry in the [tournament commonalities doc](./base.md#ensuring-constructibility) for info on this.

The only option supported at the moment is a boolean `short`:

### Short Variants
The _default_ implementation of an elimination tournament includes the usual (but sometimes controversial) extra match in each case:

 * bronze final in single elimination
 * double grand final in double elimination

Passing a `short:true` flag in the options object to the `Duel` constructor will override the default behaviour and use the short variants.

```js
// no bronze final in this
var duelSingle = new Duel(16, WB, {short: true});

// winner of LB can win the grand final in one match
var duelDouble = new Duel(16, LB, {short: true});
```

**NB:** Short double elimination tournaments are strongly discouraged because they breaks several fairness properties. As a worst case example, if player 1 and 4 met early in the tournament and 1 won, 4 could come back from the losers bracket and win the grand final in one game despite the two players being 1-1 in games overall in the tournament.

## Match Ids
Like all tournament types, matches have an `id` object that contains three values all in `{1, 2, ...}`:

```js
{
  s: Number, // the bracket - either WB or LB
  r: Number, // the round number in the current bracket
  m: Number  // the match number in the current bracket and round
}
```

## Finding matches
All the normal [Base class helper methods](./base.md#common-methods) exist on a `Duel` instance.
Some notable examples follow:

```js
var wb = duel.findMatches({ s: WB });
var lb = duel.findMatches({ s: LB });
var wbr3 = duel.findMatches({ s: WB, r: 3 });
var upcomingForSeed1 = duel.upcoming(1);
var matchesForSeed1 = duel.matchesFor(1);
```

## Scoring Matches
Call `duel.score(id, [player0Score, player1Score])` as for every match played.
The `duel.unscorable(id, scoreArray)` will tell you whether the score is valid. Read the entry in the [tournament commonalities doc](./base.md#ensuring-scorability--consistency).

### NB: Restrictions
Duel tournaments does not allow ties at any stage. It's meant to _eliminate_, so you have to do your own best of 3 / overtime methods etc to determine winners in case of draws.

## Special Methods
### Progression Trackers
A players progress is in a tournament is entirely determined by a sequence of booleans for wins/losses. If you have a match id and want to know where a player will gets sent, either to the right in the bracket or downwards to the losers bracket, pass the id to the following helpers methods:

### duel.right(id [, underdogWon]) :: [rightId, index]
### duel.down(id [, underdogWon]) :: [downId, index]

The `underdogWon` bool is simply whether the winner is the player at the bottom in the players array, and is only needed for accurate double grand final cases for double elimination.

The `index` returned is the index in the player array the winner (if `right`) or loser (if `down`) will end up in. This is mostly beneficial internally. If you end up using this, you'd likely want to look at `duel.upcoming(playerId)`.

### duel.roundName(id) :: String
Find the name of the round that `id` is found in. The `id` must minimally contain `{ s: bracket, r: round }`.

```js
var d = new Duel(4, WB);
d.roundName(d.matches[3].id);
'Bronze Final';
d.roundName(d.matches[2].id);h
'Grand Final'
```

## Caveats
### End progression
Towards the end of a duel tournament, players may move in seemingly strange ways. These are:

- In single elimination, winner of the each semi final goes to `{ s: WB, r: duel.p, m: 1 }`, whereas the loser goes to `{ s: LB, r: 1, m: 1 }`.

The `duel.p` is the power of the tournament (defined as smallest integer `p` such that `2^(p-1)` is the number of matches in WBR1). The WB final always occurs in this round.

The loser gets sent to the bronze final which is situated in "LBR1", perhaps a little oddly so, but it the bronze final does contain two losers, and it's the first round where losers get to play.

- In double elimination: the winner of the winner bracket final go to the grand final in `{ s: LB, r: 2*duel.p - 1, m: 1 }` to meet the winner of the losers bracket.

This is a special case match of double eliminations. The match is neither in the winners bracket nor the losers bracket because it got players from both, but by our convention it is located in the losers bracket. It also makes the following convention more sensible:

- In double elimination: if the grand final in `{ s: LB, r: 2*duel.p - 1, m: 1 }` is won by the player coming from the losers bracket, then a second grand final is required, and is located in `{ s: LB, r: 2*duel.p, m: 1 }`.

This makes more sense, because we can sensibly say that both players are in the losers bracket (both having lost one match). The winner of this second grand final wins the tournament. Note that if the winner of the winner bracket wins the first grand final, the second grand final (the last match in duel.matches) never gets its players filled in, however `duel.isDone()` will return true. Double elimination tournaments are the only tournaments where `isDone()` can return true while a match is not played.

### Bracket movement
In double elimination, the losers bracket _moves_ upwards to meet the winner bracket close to the final. This is a design decision that unfortunately has to be made, because it affects the match ids `score` will drop the next player at. An issue is open for this, but it is currently not prioritized.
