var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("duel WB general", function (t) {
  var duel = new T.Duel(32, T.WB)
    , gs = duel.matches
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

  var res = duel.results();
  t.ok(res, "results produced");
  t.equal(res.length, 32, "all players included in results");

  t.end();
});

test("duel LB general", function (t) {
  var duel = new T.Duel(32, T.LB)
    , gs = duel.matches
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
    , gs = duel.matches
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


// these testing too deeply => probably chuck these
/*
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
