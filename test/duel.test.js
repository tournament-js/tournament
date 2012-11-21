var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("duel 16 WB fromJSON", function (t) {
  var duel = new T.Duel(16, T.WB)
    , gs = duel.matches;

  var duel2 = T.Duel.fromJSON(gs);

  t.equal(gs.length, Math.pow(2, duel.p), "length same as num players with bronze final");

  t.deepEqual(duel.matches, duel2.matches, "matches same");
  t.equal(duel.numPlayers, duel2.numPlayers, "numPlayers kept correctly");
  t.equal(duel.isLong, duel2.isLong, "isLong flag the same");
  t.equal(duel.last, duel2.last, "last bracket the same");
  t.equal(duel.p, duel2.p, "same power");

  duel2.matches.forEach(function (g) {
    t.ok(duel2.score(g.id, [4,1]), "should be able to score all these matches");
  });

  var res = duel2.results();
  t.ok(res, "can get results");
  t.ok($.isSubsetOf($.range(4), $.pluck('pos', res.slice(0, 4))), "top 4 should have pos 1-4");

  t.end();
});

// same test wo bronze final
test("duel 16 WB short fromJSON", function (t) {
  var duel = new T.Duel(16, T.WB, {short: true})
    , gs = duel.matches;

  t.equal(gs.length, Math.pow(2, duel.p) - 1, "length same as num players - 1 without bronze final");

  var duel2 = T.Duel.fromJSON(gs);

  t.deepEqual(duel.matches, duel2.matches, "matches same");
  t.equal(duel.numPlayers, duel2.numPlayers, "numPlayers kept correctly");
  t.equal(duel.isLong, duel2.isLong, "isLong flag the same");
  t.equal(duel.last, duel2.last, "last bracket the same");
  t.equal(duel.p, duel2.p, "same power");

  duel2.matches.forEach(function (g) {
    t.ok(duel2.score(g.id, [4,1]), "should be able to score all these matches");
  });

  var res = duel2.results();
  t.ok(res, "can get results");
  // cant determine 3-vs-4th in this case!
  t.ok($.isSubsetOf([1,2,3,3], $.pluck('pos', res.slice(0, 4))), "top 4 should have pos 1,2,3,3");

  t.end();
});

// same tests with LB
test("duel 16 LB fromJSON", function (t) {
  var duel = new T.Duel(16, T.LB)
    , gs = duel.matches;

  // sizeof WB === 2^p - 1
  // sizeof LB === 2*(sizeof one p smaller WB) + 2
  t.equal(gs.length, (Math.pow(2, duel.p)-1) + 2*(Math.pow(2, duel.p - 1) - 1) + 2, "long DE length");

  var duel2 = T.Duel.fromJSON(gs);

  t.deepEqual(duel.matches, duel2.matches, "matches same");
  t.equal(duel.numPlayers, duel2.numPlayers, "numPlayers kept correctly");
  t.equal(duel.isLong, duel2.isLong, "isLong flag the same");
  t.equal(duel.last, duel2.last, "last bracket the same");
  t.equal(duel.p, duel2.p, "same power");

  duel2.matches.forEach(function (g) {
    // scorability only because this way there's a double final
    t.ok(duel2.score(g.id, [0,1]), "should be able to score all these matches");
  });

  var res = duel2.results();
  t.ok(res, "can get results");
  t.ok($.isSubsetOf($.range(4), $.pluck('pos', res.slice(0, 4))), "top 4 should have pos 1-4");

  t.end();
});

test("duel 16 LB short fromJSON", function (t) {
  var duel = new T.Duel(16, T.LB, {short: true})
    , gs = duel.matches;

  var duel2 = T.Duel.fromJSON(gs);

  // sizeof WB === 2^p - 1
  // sizeof LB === 2*(sizeof one p smaller WB) + 1 (as no gf2 this time)
  t.equal(gs.length, (Math.pow(2, duel.p)-1) + 2*(Math.pow(2, duel.p - 1) - 1) + 1, "long DE length");

  t.deepEqual(duel.matches, duel2.matches, "matches same");
  t.equal(duel.numPlayers, duel2.numPlayers, "numPlayers kept correctly");
  t.equal(duel.isLong, duel2.isLong, "bf flag the same");
  t.equal(duel.last, duel2.last, "last bracket the same");
  t.equal(duel.p, duel2.p, "same power");

  duel2.matches.forEach(function (g) {
    // scorability only because this way there's a double final
    t.ok(duel2.score(g.id, [0,1]), "should be able to score all these matches");
  });

  var res = duel2.results();
  t.ok(res, "can get results");
  t.ok($.isSubsetOf($.range(4), $.pluck('pos', res.slice(0, 4))), "top 4 should have pos 1-4");

  t.end();
});

test("duel WB general", function (t) {
  var duel = new T.Duel(32, T.WB)
    , gs = duel.matches
    , p = duel.p;

  t.equal(gs.length, Math.pow(2, p), "size of big t"); // incl bronzefinal

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

test("duel simple WB", function (t) {
  // try scoring everything in order
  var duel = new T.Duel(5, T.WB)
    , gs = duel.matches;

  var lastM = gs[gs.length-1];
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    duel.score(g.id, (g.p[0] < g.p[1]) ? [2, 0] : [0, 2]); // score highest winner
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
    if (p.seed === 1) {
      t.equal(p.pos, 1, "player 1 gets 1st");
      t.equal(p.wins, 2, "player 1 win count"); // got 1 wo free
      t.equal(p.maps, 2*2, "player 1 map count");
    }
    else if (p.seed === 2) {
      t.equal(p.pos, 2, "player 2 gets 2nd");
      t.equal(p.wins, 1, "player 2 win count"); // 1 (+wo)
      t.equal(p.maps, 1*2, "player 2 map count");
    }
    else if (p.seed === 3) {
      t.equal(p.pos, 3, "player 3 gets 3rd");
      t.equal(p.wins, 1, "player 3 win count"); // 1 + bf (+wo)
      t.equal(p.maps, 1*2, "player 3 map count");
    }
    else if (p.seed === 4) {
      t.equal(p.pos, 4, "player 4 gets 4th");
      t.equal(p.wins, 1, "player 4 win count"); // 1
      t.equal(p.maps, 1*2, "player 4 map count");
    }
    else if (p.seed === 5) {
      t.equal(p.pos, 5, "player 5 gets 5");
      t.equal(p.wins, 0, "player 5 win count");
      t.equal(p.maps, 0*2, "player 5 map count");
    }
    else {
      t.ok(false, "should not be any other players in results");
    }
  });

  var sorted = $.pluck('seed', res);
  t.deepEqual(sorted, $.range(5), "results sorted after position");

  t.end();
});

test("duel simple but big LB", function (t) {
  // try scoring everything in order
  var duel = new T.Duel(128, T.LB)
    , gs = duel.matches
    , p = duel.p;

  t.equal(gs.length, Math.pow(2, p) - 1 + 2*Math.pow(2, p - 1), "size of big t");

  var lastM = gs[gs.length-2]; // wont be a double final
  t.ok(!lastM.m, "no map scores recorded for last match yet");

  gs.forEach(function (g) {
    // will produce some warnings when there are WO markers present
    duel.score(g.id, (g.p[0] < g.p[1]) ? [2, 0] : [0, 2]); // score highest winner
  });

  t.ok(lastM.m, "map scores recorded for last match");
  var lastPls = lastM.p.filter(function (n) {
    return (n !== 0 && n !== T.WO);
  });
  // note this only true because this case gets a double final
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  var res = duel.results();
  t.ok(res, "results produced");

  var sorted = $.pluck('seed', res.slice(0, 4));
  t.deepEqual(sorted, $.range(4), "results sorted after position");

  t.end();
});



test("duel detailed LB", function (t) {
  // try scoring everything in order
  var duel = new T.Duel(5, T.LB)
    , gs = duel.matches;

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
  });

  var sorted = $.pluck('seed', res);
  t.deepEqual(sorted, [2, 3, 4, 5, 1], "results sorted after position");

  t.end();
});


test("upcoming/scorable 8 LB", function (t) {
  var d = new T.Duel(8, T.LB) // NO WO markers in this (easy case)
    , ms = d.matches;

  // WB check
  $.range(3).forEach(function (r) {

    // upcoming
    $.range(Math.pow(2, 3-r)).forEach(function (n) {
      var up = d.upcoming(n);
      t.ok(up, "upcoming match exists for round " + r + " advancer");
      t.equal(up.r, r, "upcoming match for this round is in round " + r);
      t.equal(up.s, T.WB, "upcoming match for round " + r + " is in WB");
    });

    // score
    ms.filter(function (g) {
      return (g.id.r === r && g.id.s === T.WB);
    }).forEach(function (g) {
      t.ok(d.scorable(g.id), "WB matches in round " + r + " are scorable");
      t.ok(d.score(g.id, (g.p[0] > g.p[1]) ? [1, 2] : [2, 1]), "can score a game in round " + r);
    });

    if (r === 3) {
      var up = d.upcoming(1);
      t.equal(up.s, T.LB, "upcoming match for WB final winner is in LB");
    }
  });

  // LB check
  var maxr = $.maximum($.pluck('r', $.pluck('id', ms)));
  $.range(maxr - 1).forEach(function (r) { // all rounds but gf2 round

    var roundPls = $.nub($.flatten($.pluck('p', ms.filter(function (g) {
      return (g.id.r === r && g.id.s === T.LB);
    }))));

    // upcoming
    roundPls.forEach(function (n) {
      t.ok(n >= T.NA, "player found was filled in and not a WO marker");

      var up = d.upcoming(n);
      t.ok(up, "upcoming match exists for round " + r + " advancer");
      t.equal(up.r, r, "upcoming match for this round is in round " + r);
      t.equal(up.s, T.LB, "upcoming match for round " + r + " is in LB");
    });

    // check all matches in this round
    ms.filter(function (g) {
      return (g.id.r === r && g.id.s === T.LB);
    }).forEach(function (g) {
      t.ok(d.scorable(g.id), "LB matches in round " + r + " are scorable");
      t.ok(d.score(g.id, (g.p[0] > g.p[1]) ? [1, 2] : [2, 1]), "can score a game in round " + r);
    });

    if (r === 2*d.p - 1) {
      var up = d.upcoming(1);
      t.ok(!up, "no double final, favourite won");
    }
  });

  t.end();
});

