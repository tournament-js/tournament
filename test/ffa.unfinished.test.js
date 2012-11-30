var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');


test("ffa 16 4 2 unfinished res", function (t) {
  var ffa = new T.FFA(16, [4,4], [2])
    , gs = ffa.matches;

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
  res1.slice(8).forEach(function (o) {
    t.ok(o.seed > 8, "bottom 8 seeds are here");
    t.ok(o.pos > 8, "they have no chance of getting 8th anymore");
    if ([9, 10, 11, 12].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 9, "9-12 all got got equal score 3rds and thus tie at 9th")
    }
    if ([13, 14, 15, 16].indexOf(o.seed) >= 0) {
      t.equal(o.pos, 13, "13-16 all got got equal score 4thss and thus tie at 13th")
    }
  });

  // score semis (which is the last round)
  $.range(2).forEach(function (n) {

  });

  // score semis
  ffa.score({s:1, r:2, m:2}, [4,3,2,1]); // score semi 2
  // if we just scored last then this next test would fail
  t.ok(!ffa.isDone(), "ffa should NOT be done yet");

  ffa.score({s:1, r:2, m:1}, [4,3,2,1]); // score semi 1
  t.ok(ffa.isDone(), "ffa should actually be done now");

  // check final results
  var res2 = ffa.results();
  t.ok(res2, "could get post-final semi results");

  // this is tricky - as we dont know how many actually advance
  // is this something that should be determined by the limit param?

  t.end();
});
