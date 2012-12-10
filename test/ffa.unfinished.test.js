var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("ffa 16 4 2 unfinished no limits", function (t) {
  //var ffa = new T.FFA(16, [4,4], [2], {limit: 0});
  // that should throw!

  t.end();
});

test("ffa 16 4 2 unfinished res limits", function (t) {
  var ffaB = new T.FFA(16, [4,4], [2], {limit: 4});

  // quick serialization test as only case atm
  var ffa = T.FFA.fromJSON(ffaB.matches, {limit: 4})
    , gs = ffa.matches;

  t.ok(gs.length > 0, "could create ffa with limits");

  // score first 4
  $.range(4).forEach(function (n) {
    ffa.score({s:1, r:1, m:n}, [4,3,2,1]);
  });

  var semis = gs.slice(-2);
  t.deepEqual(semis[0].p, [1,3,6,8], "fair inserts into semi1");
  t.deepEqual(semis[1].p, [2,4,5,7], "fair inserts into semi2");

  var res1 = ffa.results();
  res1.slice(0, 8).forEach(function (o) {
    t.ok(o.seed <= 8, "top 8 placer is one of top 8 seeds");
    t.equal(o.pos, 8, "top 8 placers ties at 8th before semis played");
  });
  var verifyLosers = function (res) {
    res.slice(8).forEach(function (o) {
      t.ok(o.seed > 8, "bottom 8 seeds are here");
      t.ok(o.pos > 8, "they have no chance of getting 8th anymore");
      if ([9, 10, 11, 12].indexOf(o.seed) >= 0) {
        t.equal(o.pos, 9, "9-12 all got got equal score 3rds and thus tie at 9th");
      }
      if ([13, 14, 15, 16].indexOf(o.seed) >= 0) {
        t.equal(o.pos, 13, "13-16 all got equal score 4ths and thus tie at 13th");
      }
    });
  };
  verifyLosers(res1); // bottom 8 should be ready now

  // score semis (last round)
  ffa.score({s:1, r:2, m:2}, [4,3,2,1]); // score semi 2
  // if we just scored last then this next test would fail
  t.ok(!ffa.isDone(), "ffa should NOT be done yet");

  ffa.score({s:1, r:2, m:1}, [4,3,2,1]); // score semi 1
  t.ok(ffa.isDone(), "ffa should actually be done now");

  // check final results
  var res2 = ffa.results();
  t.ok(res2, "could get post-final semi results");

  verifyLosers(res2); // bottom 8 should at least remain the same

  res2.slice(0, 8).forEach(function (o) {
    t.ok(o.seed <= 8, "top 8 seeds is in the top 8");
    t.ok(o.pos <= 8, "and they are indeed in the top 8");
    if ([1, 2].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 1, "1 and 2 both won their semi with 4");
      t.equal(o.wins, 2, "1 and 2 both proceeded to next tournament");
    }
    if ([3, 4].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 3, "3 and 4 both 2nd'd their semi with 3");
      t.equal(o.wins, 2, "3 and 4 both proceeded to next tournament");
    }
    if ([5, 6].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 5, "5 and 6 both 3rd'd their semi with 2");
      t.equal(o.wins, 1, "5 and 6 knocked out (not proceeding to next tournament)");
    }
    if ([7, 8].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 7, "7 and 8 both 4th'd their semi with 1");
      t.equal(o.wins, 1, "7 and 8 knocked out (not proceeding to next tournament)");
    }
  });


  //if we scored semi 1 differently, it used to sort really badly between the groups
  ffa.score({s:1, r:2, m:1}, [8,7,6,5]); // score semi 1 weirdly
  // NB: that was the semi with 1, 3, 6, 8 in it
  // so score list is:
  //{
  //  1: 8, POS 1 (tight)
  //  2: 4, 1
  //  3: 7, POS 2 (tight)
  //  4: 3, 2
  //  5: 2, 3
  //  6: 6, POS 3 (tight)
  //  7: 1, 4
  //  8: 5  POS 4 (tight)
  //}
  // note it should tie Xth-placers at the moment between groups

  var res2b = ffa.results();
  t.ok(res2b, "could get post-final semi results");
  verifyLosers(res2b); // bottom 8 should at least remain the same

  res2b.slice(0, 8).forEach(function (o) {
    // winners should be sorted within groups only - tie X-placers
    t.ok(o.seed <= 8, "top 8 seeds is in the top 8");
    t.ok(o.pos <= 8, "and they are indeed in the top 8");
    if (o.seed === 1) {
      t.equal(o.pos, 1, "1 won the 'tighter' semi with 8");
    }
    if (o.seed === 2) {
      t.equal(o.pos, 1, "2 won the 'easier' semi with 4");
    }
    if (o.seed === 3) {
      t.equal(o.pos, 3, "3 2nd'd the 'tighter' semi with 7");
    }
    if (o.seed === 4) {
      t.equal(o.pos, 3, "4 2nd'd the 'easier' semi with 3");
    }

    // losers can be sorted between groups, but only up to placement!
    if (o.seed === 6) {
      t.equal(o.pos, 5, "6 3rd'd the 'tighter' semi with 6");
    }
    if (o.seed === 5) {
      t.equal(o.pos, 5, "5 3rd'd the 'easier' semi with 2");
    }
    if (o.seed === 8) {
      t.equal(o.pos, 7, "8 4th'd the 'tighter' semi with 5");
    }
    if (o.seed === 7) {
      t.equal(o.pos, 7, "8 4th'd the 'easier' semi with 1");
    }
  });

  t.end();
});
