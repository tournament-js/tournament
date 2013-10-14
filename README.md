# Tournament [![Build Status](https://secure.travis-ci.org/clux/tournament.png)](http://travis-ci.org/clux/tournament) [![Dependency Status](https://david-dm.org/clux/tournament.png)](https://david-dm.org/clux/tournament)

Tournament is a pure library for managing the state and generating statistics for a collection of matches in a tournament. Tournaments are created up front and are mutated simply by scoring individual matches. State can be serialized/deserialized via a simple interface.

## Usage
Create a new tournament instance from one of the exposed classes, then interact with helper functions to score and calculate results.

```js
var t = require('tournament');
var d = new t.Duel(4, 1); // 4 players - single elimination

d.matches; // in playable order
[ { id: { s: 1, r: 1, m: 1 }, // semi 1
    p: [ 1, 4 ] },
  { id: { s: 1, r: 1, m: 2 }, // semi 2
    p: [ 3, 2 ] },
  { id: { s: 1, r: 2, m: 1 }, // grand final
    p: [ 0, 0 ] },
  { id: { s: 2, r: 1, m: 1 }, // bronze final
    p: [ 0, 0 ] } ]

// let's pretend we scored these individually in a more realistic manner
d.matches.forEach(function (m) {
  d.score(m.id, [1, 0]);
});

// now winners are propagated and map scores are recorded
d.matches;
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ],
    m: [ 1, 0 ] },
  { id: { s: 1, r: 1, m: 2 },
    p: [ 3, 2 ],
    m: [ 1, 0 ] },
  { id: { s: 1, r: 2, m: 1 }, // 1 and 3 won their matches and play the final
    p: [ 1, 3 ],
    m: [ 1, 0 ] },
  { id: { s: 2, r: 1, m: 1 }, // 4 and 2 lost and play the bronze final
    p: [ 4, 2 ],
    m: [ 1, 0 ] } ]

// can view results at every stage of the tournament, here are the final ones
d.results();
[ { seed: 1, maps: 2, wins: 2, pos: 1 },
  { seed: 3, maps: 1, wins: 1, pos: 2 },
  { seed: 2, maps: 1, wins: 1, pos: 3 },
  { seed: 4, maps: 0, wins: 0, pos: 4 } ]

```

## API
- [Base Class](./doc/base.md) plus commonalities
- [Duel Elimination](./doc/duel.md)
- [FFA Elimination](./doc/ffa.md)
- [KnockOut](./doc/knockout.md)
- [GroupStage](./doc/groupstage.md)
- [TieBreaker](./doc/tiebreaker.md) for GroupStage

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
