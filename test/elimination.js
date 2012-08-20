var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("duel WB general", function (t) {
  var duel = new T.Duel(32, T.WB)
    , gs = duel.games
    , p = duel.p;

  // size == sizeof wb (powers of two consecutively)
  t.equal(gs.length, Math.pow(2, p) - 1, "size of big t");

  var lastM = gs[gs.length-1];
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    duel.score(g.id, [0, 2]);
  });

  t.ok(lastM.m, "map scores recorded for last match");
  var lastPls = lastM.p.filter(function (n) {
    return (n !== 0 && n !== T.WO);
  });
  // note this only true because this case gets a double final
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  var res = duel.results(T.WB, p, gs);
  t.ok(res, "results produced");
  t.equal(res.length, 32, "all players included in results");

  t.end();
});


test("duel LB general", function (t) {
  var duel = new T.Duel(32, T.LB)
    , gs = duel.games
    , p = duel.p;

  // size == sizeof wb (powers of two consecutively)
  // += size of lb == 2x size of smaller WB (gfs cancels out 2x -1s)
  t.equal(gs.length, Math.pow(2, p) - 1 + 2*Math.pow(2, p - 1), "size of big t");

  var lastM = gs[gs.length-1];
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    duel.score(g.id, [0, 2]);
  });

  t.ok(lastM.m, "map scores recorded for last match");
  var lastPls = lastM.p.filter(function (n) {
    return (n !== 0 && n !== T.WO);
  });
  // note this only true because this case gets a double final
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  var res = duel.results();
  t.ok(res, "results produced");
  t.equal(res.length, 32, "all players included in results");

  t.end();
});

test("duel detailed", function (t) {
  // try scoring everything in order
  var duel = new T.Duel(5, T.LB)
    , gs = duel.games
    , p = 3;

  var lastM = gs[gs.length-1];
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    duel.score(g.id, [0, 2]);
  });

  t.ok(lastM.m, "map scores recorded for last match");
  var lastPls = lastM.p.filter(function (n) {
    return (n !== 0 && n !== T.WO);
  });
  // note this only true because this case gets a double final
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  var res = duel.results();
  t.ok(res, "results produced");

  res.forEach(function (p) {
    if (p.seed === 2) {
      t.equal(p.pos, 1, "player 2 gets 1st");
      t.equal(p.wins, 3, "player 2 win count");
      t.equal(p.maps, 3*2, "player 2 map count");
    }
    else if (p.seed === 3) {
      t.equal(p.pos, 2, "player 3 gets 2nd");
      t.equal(p.wins, 3, "player 3 win count");
      t.equal(p.maps, 3*2, "player 3 map count");
    }
    else if (p.seed === 4) {
      t.equal(p.pos, 3, "player 4 gets 3rd");
      t.equal(p.wins, 2, "player 4 win count");
      t.equal(p.maps, 2*2, "player 4 map count");
    }
    else if (p.seed === 5) {
      t.equal(p.pos, 4, "player 5 gets 4th");
      t.equal(p.wins, 1, "player 5 win count");
      t.equal(p.maps, 1*2, "player 5 map count");
    }
    else if (p.seed === 1) {
      t.equal(p.pos, 5, "player 1 gets 5-6th");
      t.equal(p.wins, 0, "player 1 win count");
      t.equal(p.maps, 0*2, "player 1 map count");
    }
    else {
      t.ok(false, "should not be any other players in results");
    }
  })

  var sorted = $.pluck('seed', res);
  t.deepEqual(sorted, [2, 3, 4, 5, 1], "results sorted after position");

  t.end();
});

// full test of a 16 4 2 ffa tournament
test("ffa 16 4 2", function (t) {
  var ffa = new T.FFA(16, 4, 2)
    , gs = ffa.games;

  t.equal(gs.length, 4 + 2 + 1, "ffa right number of games");

  // ffaResults init tests
  var res = ffa.results();
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
    ffa.score({b: T.WB, r: 1, g: g}, [4, 3, 2, 1]); // in the order of their seeds
  });

  // verify snd round filled in
  var r2 = gs.filter(function (g) {
    return g.id.r === 2;
  });

  var r2p = $.flatten($.pluck('p', r2)).sort($.compare());
  t.deepEqual(r2p, $.range(8), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = ffa.results();
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
    ffa.score({b: T.WB, r: 2, g: g}, [4, 3, 2, 1]);
  });

    // verify snd round filled in
  var r3 = gs.filter(function (g) {
    return g.id.r === 3;
  });

  var r3p = $.flatten($.pluck('p', r3)).sort($.compare());
  t.deepEqual(r3p, $.range(4), "r3 players are winners of r2");

  var res3 = ffa.results();
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
  ffa.score({b: T.WB, r: 3, g: 1}, [4, 3, 2, 1]);
  var res4 = ffa.results();
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

/*
probably chuck these tests: they test too deeply
test("right", function (t) {
  var r = T.right(T.WB, 2, {b: T.WB, r: 1, g: 1});
  t.deepEqual(r[0], {b: T.WB, r: 2, g: 1}, "1 1 -> 2 1");
  t.equal(r[1], 0, "1 1 -> next upper");

  r = T.right(T.WB, 2, {b: T.WB, r: 1, g: 2});
  t.deepEqual(r[0], {b: T.WB, r: 2, g: 1}, "1 2 -> 2 1");
  t.equal(r[1], 1, "1 1 -> next lower");

  r = T.right(T.WB, 2, {b: T.WB, r: 2, g: 1});
  t.equal(r, null, "2 1 is final at p=2, no right");

  r = T.right(T.WB, 5, {b: T.WB, r: 3, g: 3});
  t.deepEqual(r[0], {b: T.WB, r: 4, g: 2}, "3 3 -> 4 2");
  t.equal(r[1], 0, "3 3 -> next upper");

  r = T.right(T.LB, 5, {b: T.WB, r: 3, g: 3});
  t.deepEqual(r[0], {b: T.WB, r: 4, g: 2}, "3 3 -> 4 2");
  t.equal(r[1], 0, "3 3 -> next upper");

  r = T.right(T.LB, 3, {b: T.LB, r: 3, g: 2});
  t.deepEqual(r[0], {b: T.LB, r: 4, g: 2}, "LB 3 2 -> 4 2");
  t.equal(r[1], 1, "LB 3 2 -> next lower (upper from WB)");

  r = T.right(T.LB, 3, {b: T.LB, r: 4, g: 2});
  t.deepEqual(r[0], {b: T.LB, r: 5, g: 1}, "LB 4 2 -> 5 1");
  t.equal(r[1], 1, "LB 4 2 -> next lower (upper from WB)");

  r = T.right(T.LB, 3, {b: T.LB, r: 5, g: 1}, false);
  t.equal(r, null, "no gf2 unless fourth parameter indicates need for it");

  r = T.right(T.LB, 3, {b: T.LB, r: 5, g: 1}, true);
  t.deepEqual(r[0], {b: T.LB, r: 6, g: 1}, "LB 5 1 -> 6 1");
  t.equal(r[1], 0, "LB 5 1 -> next upper (GF2 switch)");

  t.end();
});

test("down", function (t) {
  var d = T.down(T.LB, 2, {b: T.WB, r: 1, g: 1});
  t.deepEqual(d[0], {b: T.LB, r: 1, g: 1}, "1 1 -> LB 1 1");
  t.equal(d[1], 0, "1 1 -> LB down upper");

  d = T.down(T.LB, 2, {b: T.WB, r: 1, g: 2});
  t.deepEqual(d[0], {b: T.LB, r: 1, g: 1}, "1 2 -> LB 1 1");
  t.equal(d[1], 1, "1 1 -> LB down lower");

  d = T.down(T.WB, 2, {b: T.WB, r: 1, g: 1});
  t.equal(d, null, "no downs from WB in single elim");

  d = T.down(T.LB, 3, {b: T.WB, r: 3, g: 1});
  t.deepEqual(d[0], {b: T.LB, r: 4, g: 1}, "3 1 -> LB 4 1");
  t.equal(d[1], 0, "3 1 -> LB down upper");

  d = T.down(T.LB, 3, {b: T.LB, r: 5, g: 1}, true);
  t.deepEqual(d[0], {b: T.LB, r: 6, g: 1}, "LB 5 1 -> LB 6 1");
  t.equal(d[1], 1, "LB 5 1 -> LB lower (gf1 loser to bottom)");

  t.end();
});
*/
