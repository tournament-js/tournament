var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

// detailed simple knockout
test("ko 10 [2,4,2]", function (t) {
  var kos = [2,4,2];
  var ko = new T.KnockOut(10, kos)
    , ms = ko.matches;

  t.equal(ms.length, kos.length + 1, "games required");
  ms.forEach(function (m, i) {
    t.equal(m.id.r, i+1, "round is one indexed, and one match per round");
  });
  t.deepEqual(ms[0].p, $.range(10), "all 10 players in r1");

  var leftover = 10;
  kos.forEach(function (k, i) {
    var r = i+1;
    // remaining matches unscored
    ms.slice(r).forEach(function (m) {
      t.equal($.nub(m.p).length, 1, "all T.NA in round " + m.id.r);
    });

    // is ONLY current match scorable?
    ms.forEach(function (m) {
      t.equal(ko.scorable(m.id), (m.id.r === r), "can score iff r==" + r);
    });

    // score current round r (so that highest seed wins)
    t.ok(ko.score(ms[i].id, $.range(leftover).reverse()), "could score r" + r);

    // check progression
    t.deepEqual(ms[i+1].p, $.range(leftover - k), k + " knocked out of " + leftover);

    leftover -= k; // only this many left for next round
  });

  // now all matches should have players
  leftover = 10;
  ms.forEach(function (m, i) {
    t.deepEqual(m.p, $.range(leftover), leftover + " players in r" + m.id.r);
    leftover -= kos[i];
  });

  t.end();
});

