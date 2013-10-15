# Knockout tournaments

    Stability: 2 - Unstable

## Overview
Knockout tournaments consist of a pool of players, repeatedly fighting against each other and gradually reducing the number of players each round. We specify the number of players to knock out each round as an array of integers.

## Construction
Simply specify the number of players and an array of numbers to knock out per rounds. The resulting tournament will have the same number of matches as that array's length + 1.

```js
var ko = new KnockOut(10, [3, 2, 2]);
```

This example will create a 10 player match in round 1, a 7 player match in round 2, a 5 player match in round 3, and a 3 player final.

## Limits
TODO: simple, only adds a disambiguation clause for the final

## Match Ids
Like all tournament types, matches have an `id` object that contains three values all in `{1, 2, ...}`:

```js
{
  s: Number, // the bracket - always 1 TODO: remove?
  r: Number, // the round number in the current bracket
  m: Number  // the match number - always 1, only one match per round TODO: remove?
}
```

## Finding matches
All the normal [Base class helper methods](./base.md#common-methods) exist on a `Duel` instance. That said, knockouts are so simple you can do this very simply anyway:

```js
var r1 = ko.findMatches({ r: 1 });
// NB: equivalent to: ko.matches[0]

var firstThreeRounds = ko.findMatchesRanged({}, { r: 3 });
// NB: equivalent to: ko.matches.slice(0, 3)

var upcomingForSeed1 = ko.upcoming(1);
var matchesForSeed1 = ko.matchesFor(1);
```

## Scoring Matches
Call `ko.hscore(id, [player0Score, player1Score, ...])` as for every match played.
The `ko.unscorable(id, scoreArray)` will tell you whether the score is valid. Read the entry in the [tournament commonalities doc](./base.md#ensuring-scorability--consistency).

### NB: Ambiguity restriction
KnockOuts allow for ties everywhere except between the first knocked out player and the last advancing player. In the final, ties are fully allowed, so multiple players can share the first place. Check for this if it's unsuited to your game/application.

## Special Methods
None.

## Caveats
None. Maybe a note that this is technically a special case of FFA eliminations.
