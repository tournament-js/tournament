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

test("duel", function (t) {
  // try scoring everything in order
  var gs = T.duelElimination(T.LB, 5);
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

// full test of a 4 2 16 ffa tournament
test("ffa 4 2 16", function (t) {
  var gs = T.ffaElimination(4, 2, 16);
  t.equal(gs.length, 4 + 2 + 1, "ffa right number of games");

  // ffaResults init tests
  var res = T.ffaResults(gs, 16);
  t.equal(res.length, 16, "all players had stats computed before scoring");

  var poss = $.nub($.pluck('pos', res));
  t.equal(poss.length, 1, "all players have same score");
  t.equal(poss[0], 9, "tied at 9"); // wont distinguish across matches

  var winss = $.nub($.pluck('wins', res));
  t.equal(winss.length, 1, "all players have same wins");
  t.equal(winss[0], 0, "all won 0");

  var sums = $.nub($.pluck('sum', res));
  t.equal(sums.length, 1, "all players have same sum");
  t.equal(sums[0], 0, "all sum 0");

  var seedss = $.nub($.pluck('seed', res));
  t.equal(seedss.length, 16, "all different seeds represented");
  t.deepEqual(seedss.sort($.compare()), $.range(16), "should be all 16");


  // now score the first round
  $.range(4).forEach(function (g) {
    T.scoreFfa(gs, {b: T.WB, r: 1, g: g}, [4, 3, 2, 1]); // in the order of their seeds
  });

  // verify snd round filled in
  var r2 = gs.filter(function (g) {
    return g.id.r === 2;
  });

  var r2p = $.flatten($.pluck('p', r2)).sort($.compare());
  t.deepEqual(r2p, $.range(8), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = T.ffaResults(gs, 16);
  t.ok(res2, "got results 2");

  res2.forEach(function (p) {
    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 3, "top 4 seeds won their matches (all beat 3)");
      t.equal(p.pos, 5, "top 8 advances and should be positioned to tie at 5th");
    }
    if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "5-8th seed got 2nd in their matches (all beat 2)");
      t.equal(p.pos, 5, "top 8 advances and should tie at 5th");
    }
    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "9-12th seed got 3nd in their matches (all beat 1)");
      t.equal(p.pos, 9, "non-advancers tie at 9th");
    }
    if ([13, 14, 15, 16].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "13-16th seed got 4th in their matches (all beat 0)");
      t.equal(p.pos, 9, "non-advancers tie at 9th");
    }
  });

  $.range(2).forEach(function (g) {
    T.scoreFfa(gs, {b: T.WB, r: 2, g: g}, [4, 3, 2, 1]);
  });

    // verify snd round filled in
  var r3 = gs.filter(function (g) {
    return g.id.r === 3;
  });

  var r3p = $.flatten($.pluck('p', r3)).sort($.compare());
  t.deepEqual(r3p, $.range(4), "r3 players are winners of r2");

  var res3 = T.ffaResults(gs, 16);
  t.ok(res3, "got results 3");

  res3.forEach(function (p) {
    if ([1, 2].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 6, "top 2 seeds won both their matches (all beat 3)x2");
    }
    if ([3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 5, "3-4th got 1st and 2nd place over 2 matches");
    }
    if ([5, 6].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 3, "5-6th got 2nd and 3rd place over 2 matches");
    }
    if ([7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "7-8th got 2nd and 4th place over 2 matches");
    }

    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.pos, 4, "top 4 advanced to r3 and start out tieing at final 4th");
    }
    if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.pos, 5, "bottom of top 8 only gets to r2 and should remain in 5th");
    }
    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "9-12th seed got 3nd in their match (all beat 1)");
      t.equal(p.pos, 9, "non-advancers tie at 9th");
    }
    if ([13, 14, 15, 16].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "13-16th seed got 4th in their match (all beat 0)");
      t.equal(p.pos, 9, "non-advancers tie at 9th");
    }
  });

  // score final
  T.scoreFfa(gs, {b: T.WB, r: 3, g: 1}, [4, 3, 2, 1]);
  var res4 = T.ffaResults(gs, 16);
  t.ok(res4, "got results 4");

  res4.forEach(function (p) {
    if (p.seed === 1) {
      t.equal(p.wins, 9, "1 won all 3 matches");
      t.equal(p.pos, 1, "1 placed highest");
      t.equal(p.sum, 12, "sum scores for 1: 4 + 4 + 4");
    }
    if (p.seed === 2) {
      t.equal(p.wins, 8, "2 scored 1, 1, 2");
      t.equal(p.pos, 2, "2 placed 2nd");
      t.equal(p.sum, 11, "sum scores for 2: 4 + 4 + 3");
    }
    if (p.seed === 3) {
      t.equal(p.wins, 6, "3 scored 1, 2, 3");
      t.equal(p.pos, 3, "3 placed 3rd");
      t.equal(p.sum, 9, "sum scores for 3: 4 + 3 + 2");
    }
    if (p.seed === 4) {
      t.equal(p.wins, 5, "4 scored 1 2 4");
      t.equal(p.pos, 4, "4 placed 4th");
      t.equal(p.sum, 8, "sum scores for 2: 4 + 3 + 1");
    }
  });

  t.end();
});

