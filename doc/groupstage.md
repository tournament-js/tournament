# GroupStage

Group stages are preliminary tournaments designed to pick out the best players by splitting them up in fair groups of requested size. They are advantageous compared to eliminations because they guarantee at least `groupSize-1` matches per player as opposed to `Duel` which guarantee only one or two (in double elimination).

GroupStage tournaments are simple, customizable, and add an interesting filter to other tournaments. This class is well tested and stable.

## Construction
Specify the number of players and the group size.

```js
// 16 players in groups of 4
var gs1 = new t.GroupStage(16, 4);

// 9 players in groups of 3
var gs2 = new t.GroupStage(9, 3);
```

The `GroupStage.invalid(numPlayers, groupSize)` will tell you whether the constructor arguments produce a valid tournament. Read its entry in the [tournament commonalities doc](./base.md#ensuring-constructibility) for info on this.

## Match ids
Like all tournament types, matches have an `id` object that contains three values all in `{1, 2, ...}`:

```js
{
  s: Number, // the group number
  r: Number, // the round number
  m: Number  // the match number
}
```

## Finding matches
All the normal [Base class helper methods](./base.md#common-methods) exist on a `GroupStage` instance.
Some notable examples follow:

```js
var group1 = gs.findMatches({ s: 1 });
var group2round1 = gs.findMatches({ s: 2, r: 1 });
var upcomingForSeed1 = gs.upcoming(1);
var matchesForSeed1 = gs.matchesFor(1);
```

## Scoring matches
Call `gs.score(id, [player0Score, player1Score])` as for every match played.
The `gs.unscorable(id, scoreArray)` will tell you whether the score is valid. Read the entry in the [tournament commonalities doc](./base.md#ensuring-scorability--consistency).

### NB: Few restrictions
Unlike any other tournament, `GroupStages` allow for individual match ties. The results are simply tallied up by points (configurable) at the end. If match ties is not possible/ideal, just check for it externally:

```js
var score = function (id, score) {
  // assumes you have guarded on `gs.unscorable` earlier
  if (score[0] !== score[1]) {
    // filtering out the ties - but should probably present an error reason
    gs.score(id, score);
  }
};
```

## Special methods
### groupFor(seedNumber) :: [Match]
Get all the matches in the group that a given player is in.

## Caveats
### End results
Acting on end results in a group stage is sometimes problematic. Ties are allowed, and complex, unexpected results can cause multi-way ties (it is possible for an entire group to tie), and `results()` even if ties have been disallowed. We cannot sensibly compensate for that without additional input:

#### Results config
Unlike any other tournament `GroupStage` can compute results in a variable manner. An options object can be passed to `gs.results(opts)` that will use any of the following:

```js
{
  winPoints: Number, // Number of points awarded per win - default 3
  tiePoints: Number, // Number of points awarded per tie - default 1
  mapsBreak: Boolean, // Look at the sum of map scores in case of ties - default false
}
```

#### Tiebreaking
But in some cases, even this is insufficient. For this you need to forward the `gs.results()` to a [`TieBreaker` tournament](./tiebreaker.md).

### Seeding and groups
Like for most other tournaments, seeding is important. The initial player partitioning into groups is done in such a way so that there is a variety of differently skilled players:

 - If the number of players is divisible by the number of groups (ideal condition), then the sum of the seeds in each group differ by at most the number of groups.

```js
t.groups(15, 5); // 15 players in groups of 5
[ [ 1, 4, 7, 12, 15 ],
  [ 2, 5, 8, 11, 14 ],
  [ 3, 6, 9, 10, 13 ] ]
```

 - If additionally, every group size is even, then the sum of seeds in each group is identical.

These conditions make standard group arrangements like 16 players in groups of 4 perfectly fair, provided the seeding is perfect.

```js
> t.groups(16, 4)
[ [ 1, 5, 12, 16 ],
  [ 2, 6, 11, 15 ],
  [ 3, 7, 10, 14 ],
  [ 4, 8, 9, 13 ] ]
```

This model ensures that unusual results are directly caused by upsets (a presumed bad player beats a higher ranked one), not the fact that the top 4 players was in one group, causing lower ranked players to advance from the group stage without merit.
