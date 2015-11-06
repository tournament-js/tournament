# Tournament
[![npm status](http://img.shields.io/npm/v/tournament.svg)](https://www.npmjs.org/package/tournament)
[![build status](https://secure.travis-ci.org/clux/tournament.svg)](http://travis-ci.org/clux/tournament)
[![dependency status](https://david-dm.org/clux/tournament.svg)](https://david-dm.org/clux/tournament)
[![coverage status](http://img.shields.io/coveralls/clux/tournament.svg)](https://coveralls.io/r/clux/tournament)

Tournament provides a base class for stateful tournament types of fixed size tournaments.

All tournaments have a huge amount of common logic so the helper methods included on this base class is worth reading about even if you don't use this module directly.

You should read at least one of:

- [tournament base class and commonalities](./doc/base.md)
- [implementors guide](./doc/implementors.md)

Implementions:

- [duel](https://github.com/clux/duel)
- [ffa](https://github.com/clux/ffa)
- [groupstage](https://github.com/clux/groupstage)
- [masters](https://github.com/clux/masters)
- [tiebreaker](https://github.com/clux/tiebreaker)

For multi stage tournaments, or if you need to grab functionality from multiple implementations, there is also a module for that:

- [tourney](https://github.com/clux/tourney)

## Example implementation usage
Create a new tournament instance from one of the separate implementations, then interact with helper functions to score and calculate results.

```js
var Duel = require('duel');
var d = new Duel(4); // 4 players - single elimination

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
[ { seed: 1, wins: 2, for: 2, against: 0, pos: 1 },
  { seed: 3, wins: 1, for: 1, against: 1, pos: 2 },
  { seed: 4, wins: 1, for: 1, against: 1, pos: 3 },
  { seed: 2, wins: 0, for: 0, against: 2, pos: 4 } ]
```

## Installation
For specific tournament usage, install the modules you want:

```bash
$ npm install duel ffa groupstage tiebreaker --save
```

To use these on in the browser, bundle it up with [browserify](https://npmjs.org/package/browserify)

```bash
$ npm dedupe
$ browserify -r duel -r ffa -r groupstage -r tiebreaker > bundle.js
```

## License
MIT-Licensed. See LICENSE file for details.
