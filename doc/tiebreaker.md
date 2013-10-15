# TieBreaker

    Stability: 1 - Experimental

## Overview
The `TieBreaker` class is a tournament type that slightly differs from all the others, in that it cannot be created from scratch, but rather from the results of a finished `GroupStage` only. To see why this tournament type is better to have than just a `limit` parameter for `GroupStage` consider the following.

## GroupStage Results
Unlike every other tournament type, `GroupStage` cannot give out current positions in `results()` via the `.pos` attribute. This is because so many different combinations of ties are possible - both within groups, and between groups - that winning a few matches may not always result in a net increase in `.pos`. Instead, `GroupStage` needs all the matches played before `.pos` and `gpos` is calculated.

To illustrate the current behaviour, consider a fully scored 8 players `GroupStage` with 2 groups of 4 players in each, i.e. `new GroupStage(8, 4)`. This will create groups via `t.groups(8,4)` and round robin schedule each group via `t.robin(4, playerAry)` i.e. 6 matches over 3 rounds per group.

We score:

- group 1 so that round 1 matches are scored `[1,0]` and every other match `[0,1]`.
- group 2 so that round 4 matches are scored `[1,0]` and every other match `[0,1]`.

This **forces two different three-way ties** within each group.

Here is what `.results()` outputs after such scoring (here the output have been partitioned by group, and had the `wins`, `draws` and `losses` properties removed for readibility).

```js
g1:
 [ { seed: 3, maps: 3, pts: 9, pos: 1, gpos: 1, grp: 1 },
  { seed: 1, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 6, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 8, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 } ]
g2:
 [ { seed: 4, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 5, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 7, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 2, maps: 0, pts: 0, pos: 8, gpos: 4, grp: 2 } ]
```

So this is pretty awful for advancing any number of players to another tournament.
Even if we broke by maps via `gs.results({mapsBreak:true})`, it would not have made a difference here because every map score was either `1` or `0`.

## Problem with `limit`
We could try to bolt on this TieBreaker functionality inside the `GroupStage` class by adding the optional `limit` parameter that some tournament types have implemented, but this would:

- add a lot of unnecessary complexity for a problem that may ultimately be solved in many ways
- remove/obscure a fundamental property of all tournament types: rescorability

Turns out `TieBreaker` needed more logic than the actual `GroupStage`, and that was just for the very simplistic way of solving the problem.

If matches are allowed to be rescored then it having `GroupStage` under the covers to a lot of work to work out new tiebreaker scenarios and potentially wipe out old scores in them is really silly.

## TieBreaker Tournament
The decision was therefore instead to add an entirely new tournament type, and have the final results of the `GroupStage` passed in to indicate that the `GroupStage` is now effectively frozen.

## TieBreaker Algorithm
`TieBreaker` solves the problem of both within-group and between group ties on a need-to-break basis: you specify how many players you want to forward to the next tournament, and the `TieBreaker` constructor creates the least amount of matches necessary to determine this.

The idea is simple: if you to forward `p` players from a `GroupStage` containing `n` players, then you need to find the top `p/numGroups` from each group and forward these.

If `p` divides `numGroups` then you only need to ensure each group is sufficiently untied that we can take an equal amount from each.
If `p` does not divide `numGroups`, then you also have to do a tiebreaker match between groups - i.e. if you have 12 players in groups of 4, and you want the top 4, then you have to take the winners of each group, and one of the 2nd placers in each group.

The `TieBreaker` tournament creates matches in round 1 (within group tiebreakers) for clusters of tied players at the border of `p/numGroups` - unless these clusters already are guaranteed to go through (future examples explain this better).

Then, it creates a blank round 2 match for the between group tiebreaker that will be filled in once the actual group results have been sufficiently determined. In the 12 players example this would put the three 2nd placers in the between group match.

At the end of the tournament, you can call `results()` like any other tournament, and the first `p` entries in the resulting list will be the ones to advance.

## Example
Consider the example continued from above with 8 players in groups of 4 with two three-way ties where the results (partitioned by group) looks like this:

```js
g1:
 [ { seed: 3, maps: 3, pts: 9, pos: 1, gpos: 1, grp: 1 },
  { seed: 1, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 6, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 8, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 } ]
g2:
 [ { seed: 4, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 5, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 7, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 2, maps: 0, pts: 0, pos: 8, gpos: 4, grp: 2 } ]
```

I.e. the final `GroupStage` group positions were:

- group 1: 1st: [3], 2nd: [1,6,8]
- group 2: 1st: [4,5,7], 4th: [2]

So if we want the top six to advance, then we need to split up the cluster in group 1:

```js
var tb = new TieBreaker(gs.results(), 6);
tb.matches;
[ { id: { s: 0, r: 1, m: 1 }, p: [ 1, 6, 8 ] } ]
```

Only the first three-way tie between players [1,6,8] must be resolved. The three way tie between [4,6,7] is irrelevant because if you want the top 6, you still get the top 3 from each group as expected.

However, if you requested the top 4:

```js
var tb = new TieBreaker(gs.results(), 4);
tb.matches;
[ { id: { s: 0, r: 1, m: 1 }, p: [ 1, 6, 8 ] },
  { id: { s: 0, r: 1, m: 2 }, p: [ 4, 5, 7 ] } ]
```

Both three-way ties must here be resolved.

### Pathological Case
An even more complicated case is when you want to advance a number that is not actually a multiple of the number of groups:

```js
var tb = new TieBreaker(gs.results(), 5);
tb.matches;
[ { id: { s: 0, r: 1, m: 1 }, p: [ 1, 6, 8 ] },
  { id: { s: 0, r: 1, m: 2 }, p: [ 4, 5, 7 ] },
  { id: { s: 0, r: 2, m: 1 }, p: [ 0, 0 ] } ]
```

You may never want this, but if you do, be advised that this may cause an extra match to take place AFTER all the within group tiebreakers (if any) have been resolved.

By convention, the within group tiebreakers are in round 1 (r:1) and the between group tiebreakers are in round 2. The player array for the last match will be populated at the end of round 1 like in an `FFA` elimination tournament.

### Example Results
`TieBreaker` tournaments follow the module's convention and can generate `.results()` as well.
These results look almost exactly like the ones returned from `GroupStage`, but they will update the `.pos`, `.gops` property for all affected players (which is not necessarily just the players in `tb.matches`), as well as sort the results based on the final `.pos` property.

And, like other tournaments, you can request to get these results at any time, but before at least round 1 is done you simply get the old `GroupStage` results back.

NB: any `results()`  will omit the `wins`, `draws` and `losses` properties for readibility.

Before we score anything in `tb` the results will be the unchanged:


```js
[ { seed: 3, maps: 3, pts: 9, pos: 1, gpos: 1, grp: 1 },
  { seed: 4, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 5, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 7, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 1, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 6, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 8, maps: 1, pts: 3, pos: 5, gpos: 2, grp: 1 },
  { seed: 2, maps: 0, pts: 0, pos: 8, gpos: 4, grp: 2 } ]
```

If we score the round one tiebreakers `[3,2,1]` each (i.e. better seed => better score),
then the groups are fully unbroken become fully unbroken:

```js
[ { seed: 3, maps: 3, pts: 9, pos: 1, gpos: 1, grp: 1 },
  { seed: 4, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 5, maps: 2, pts: 6, pos: 3, gpos: 2, grp: 2 },
  { seed: 1, maps: 1, pts: 3, pos: 4, gpos: 2, grp: 1 },
  { seed: 7, maps: 2, pts: 6, pos: 5, gpos: 3, grp: 2 },
  { seed: 6, maps: 1, pts: 3, pos: 5, gpos: 3, grp: 1 },
  { seed: 8, maps: 1, pts: 3, pos: 7, gpos: 4, grp: 1 },
  { seed: 2, maps: 0, pts: 0, pos: 8, gpos: 4, grp: 2 } ]
```

Since in this case we wanted the top 5, the system has not yet determined if seed 6 or 7 get the 5th place for themselves, so they are currently tied at this.

We can see that `tb.matches` has updated the last match:

```js
tb.matches[2];
{ id: { s: 0, r: 2, m: 1 }, p: [ 6, 7 ] }
```

So if we score this match `[2,1]` say, then seed 6 should take the 5th place and knock seed 7 down to 6th.

```js
tb.isDone(); // false
tb.score(tb.matches[2].id, [2,1]);
tb.results();
[ { seed: 3, maps: 3, pts: 9, pos: 1, gpos: 1, grp: 1 },
  { seed: 4, maps: 2, pts: 6, pos: 2, gpos: 1, grp: 2 },
  { seed: 5, maps: 2, pts: 6, pos: 3, gpos: 2, grp: 2 },
  { seed: 1, maps: 1, pts: 3, pos: 4, gpos: 2, grp: 1 },
  { seed: 6, maps: 1, pts: 3, pos: 5, gpos: 3, grp: 1 },
  { seed: 7, maps: 2, pts: 6, pos: 6, gpos: 3, grp: 2 },
  { seed: 8, maps: 1, pts: 3, pos: 7, gpos: 4, grp: 1 },
  { seed: 2, maps: 0, pts: 0, pos: 8, gpos: 4, grp: 2 } ]
tb.isDone(); // true
tb.results().slice(0,5).map(function (r) {
  return r.seed;
}); // these players can proceed to another tournament
[ 3, 4, 5, 1, 6 ]
```

Note that once `isDone()` returns true we can safely pick the top 5 here.
