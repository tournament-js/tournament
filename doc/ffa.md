# FFA elimination tournaments

    Stability: 2 - Unstable

## Overview
FFA elimination tournaments consist of FFA matches that are bracketed like a duel elimination tournament. The only other main difference is that the number of players per match is greater than two and the number advancing per match advancing can be greater than one.

## Construction
You must specify precisely the required group size for each round and how many to advance.
This is really the hardest part of an FFA elimination. There are essentially endless possibilities, and we will allow very exotic and adventurous ones as long as they are at least playable and non-trivial. See the [Ensuring Constructibility](./base.md#ensuring-constructibility) section for how to check your parameters.

```js
var ffa = new FFA(16, [4, 4, 4], [2, 2]); // 16 players in matches of 4 each round, top 2 advances between each
```

## Limits
TODO:

## Match Ids
Like all tournament types, matches have an `id` object that contains three values all in `{1, 2, ...}`:

```js
{
  //TODO maybe remove bracket number if not in use?
  s: Number, // the bracket - always 1 at the moment - only winners bracket supported
  r: Number, // the round number in the current bracket
  m: Number  // the match number in the current bracket and round
}
```

## Finding matches
All the normal [Base class helper methods](./base.md#common-methods) exist on a `Duel` instance. Some notable examples follow:

```js
var r1 = ffa.findMatches({ r: 1 });
var firstRounds = ffa.findMatchesRanged({}, { r: 2 });
var upcomingForSeed1 = ffa.upcoming(1);
var matchesForSeed1 = ffa.matchesFor(1);
```

## Scoring Matches
Call `ffa.score(id, [player0Score, player1Score, ...])` as for every match played.
The `ffa.unscorable(id, scoreArray)` will tell you whether the score is valid. Read the entry in the [tournament commonalities doc](./base.md#ensuring-scorability--consistency).

### NB: Ambiguity restriction
Individual ties are only allowed as long as we can discriminate between the last advancer and the first non-advancers. If these two scores are identical, the ambiguity is disallowed and `.score()` will return false (equivalently `unscorable()` will tell you this).

## Special Methods
### Upcoming
Unlike the normal implementation of `d.upcoming(seedNumber)`, `FFA` does extra work:

If the current round has not been fully completed yet, then `ffa.upcoming(seed)` may return a partial id, like `{r: 4}` missing a game number, as each round creates new seeds for a fair new round based on previous performance, and thus all the game results from this round are needed to determine a player's next game number. Note that such an id can still be represented via the `.idString()` function.


## Caveats
### Construtcibility Constrains
Very STRITCT TODO
### Scorability constraints
TODO: disambiguation clause
