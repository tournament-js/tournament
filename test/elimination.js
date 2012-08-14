var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("placement", function (t) {
  t.equal(T.placement(T.WB, 2, 1), 3, "placement 2 1");
  t.equal(T.placement(T.WB, 2, 2), 2, "placement 2 2");
  t.equal(T.placement(T.WB, 2, 3), 1, "placement 2 3");

  t.equal(T.placement(T.WB, 3, 1), 5, "placement 3 1");
  t.equal(T.placement(T.WB, 3, 2), 3, "placement 3 2");
  t.equal(T.placement(T.WB, 3, 3), 2, "placement 3 3");
  t.equal(T.placement(T.WB, 3, 4), 1, "placement 3 4");

  t.equal(T.placement(T.WB, 4, 5), 1, "placement 4 5");
  t.equal(T.placement(T.WB, 4, 4), 2, "placement 4 4");

  t.equal(T.placement(T.LB, 2, 1), 4, "placement LB 2 1");
  t.equal(T.placement(T.LB, 2, 2), 3, "placement LB 2 2");
  t.equal(T.placement(T.LB, 2, 3), 2, "placement LB 2 3");
  t.equal(T.placement(T.LB, 2, 4), 2, "placement LB 2 4");
  t.equal(T.placement(T.LB, 2, 5), 1, "placement LB 2 5");

  t.equal(T.placement(T.LB, 3, 1), 7, "placement LB 3 1");
  t.equal(T.placement(T.LB, 3, 2), 5, "placement LB 3 2");
  t.equal(T.placement(T.LB, 3, 3), 4, "placement LB 3 3");
  t.equal(T.placement(T.LB, 3, 4), 3, "placement LB 3 4");
  t.equal(T.placement(T.LB, 3, 5), 2, "placement LB 3 5");
  t.equal(T.placement(T.LB, 3, 6), 2, "placement LB 3 6");
  t.equal(T.placement(T.LB, 3, 7), 1, "placement LB 3 7");

  t.equal(T.placement(T.LB, 4, 8), 2, "placement LB 4 8");
  t.equal(T.placement(T.LB, 4, 9), 1, "placement LB 4 9");

  t.end();
});

test("elimination", function (t) {
  // try scoring everything in order
  var gs = T.elimination(T.LB, 5);
  var p = 3;
  var lastM = gs[gs.length-1];
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    T.scoreDuel(T.LB, p, gs, g.id, [0, 2]);
  });

  t.ok(lastM.m, "map scores recorded for last match");
  var lastPls = lastM.p.filter(function (n) {
    return (n !== 0 && n !== T.WO);
  });
  // note this only true because this case gets a double final
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  var res = T.duelResults(T.LB, 3, gs);
  //t.deepEqual(res, {}, "r"); // TODO: proper test that things progressed as expected
  t.ok(res, "results produced");

  t.end();
});

