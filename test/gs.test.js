var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , GroupStage = require('../groupstage')
  , rep = GroupStage.idString;

test("group stage 10 6 serialize", function (t) {
  t.equal(GroupStage.invalid(10, 6), null, "can construct a 10 6 group stage");
  var gs = new GroupStage(10, 6);
  var gs2 = GroupStage.parse(gs + '');

  t.equal(gs.groupSize, 5, "group size reduced to as insufficient players");

  t.deepEqual(gs.matches, gs2.matches, "matches same");
  t.equal(gs.groupSize, gs2.groupSize, "groupSize recalculated correctly");
  t.equal(gs.numPlayers, gs2.numPlayers, "numPlayers kept correctly");

  gs2.matches.forEach(function (g) {
    t.ok(gs2.score(g.id, [1,0]), "should be able to score all these matches");
  });

  t.end();
});


test("group stage 16 4 serialize", function (t) {
  var gs = new GroupStage(16, 4);
  var gs2 = GroupStage.parse(gs + '');

  t.deepEqual(gs.matches, gs2.matches, "matches same");
  t.equal(gs.groupSize, gs2.groupSize, "groupSize recalculated correctly");
  t.equal(gs.numPlayers, gs2.numPlayers, "numPlayers kept correctly");

  gs2.matches.forEach(function (g) {
    t.ok(gs2.score(g.id, [1,0]), "should be able to score all these matches");
  });

  t.end();
});

// couple of tests to ensure correct lengths
test("group stage 16 4", function (t) {
  t.equal(GroupStage.invalid(16, 4), null, "can construct a 16 4 group stage");
  var gs = new GroupStage(16, 4)
    , ms = gs.matches;
  // should be 4 rounds, with 3 matches for each player, i.e. 3! matches

  var numGroups = $.maximum(ms.map($.get('id', 's')));
  var numRounds = $.maximum(ms.map($.get('id', 'r')));

  t.equal(numGroups, 4, "should be 4 groups (of 4)");
  t.equal(numRounds, 3, "should be 3 rounds");

  t.equal(ms.length, 4*(3*2), "4x3 rounds of (4/2) matches in total");

  t.end();
});

test("group stage 32 8", function (t) {
  t.equal(GroupStage.invalid(32, 8), null, "can construct a 32 8 group stage");
  var gs = new GroupStage(32, 8)
    , ms = gs.matches;

  var numGroups = $.maximum(ms.map($.get('id', 's')));
  var numRounds = $.maximum(ms.map($.get('id', 'r')));

  t.equal(numGroups, 4, "should be 4 groups (of 8)");
  t.equal(numRounds, 7, "should be 7 rounds");

  t.equal(ms.length, 4*7*4, "4x7 rounds of (8/2) matches in total");

  ms.forEach(function (g) {
    gs.score(g.id, (g.p[0] < g.p[1]) ? [2, 0] : [0, 2]);
  });
  var res = gs.results();
  t.ok(res, "we could get results");

  res.forEach(function (r) {
    t.ok(r.wins >= 0 && r.wins <= 7, "between 0 and 7 wins");
    t.ok(r.maps >= 0 && r.maps <= 2*7, "between 0 and 14 maps");
    t.ok(r.pos >= 1 && r.pos <= 32, "places between 1 and 32");
    t.equal(r.maps, r.wins*2, "maps === wins*2 for each result summary here");
    t.equal(r.pts, r.wins*3, "points == 3 per mapwin");
    t.ok(r.gpos !== undefined, "group property exists");
    t.ok(1 <= r.grp && r.grp <= 4, "grp stored");
  });

  // x-placers sorterd across groups based on pts and maps
  res.slice(0, 4).forEach(function (r) {
    t.ok($.range(4).indexOf(r.seed) >= 0, "winner of each group in top 4");
    t.equal(r.pts, 7*3, "all winners won 7 matches");
  });
  res.slice(4, 8).forEach(function (r) {
    t.ok($.range(5, 8).indexOf(r.seed) >= 0, "2nd placers in each group in 5-8th");
    t.equal(r.pts, 6*3, "all 2nd placers won 6 matches");
  });
  res.slice(8, 12).forEach(function (r) {
    t.ok($.range(9, 12).indexOf(r.seed) >= 0, "3rd placers in each group 9-12th");
    t.equal(r.pts, 5*3, "all 3rd placers won 5 matches");
  });

  t.end();
});


test("group stage 50 10", function (t) {
  t.equal(GroupStage.invalid(50, 10), null, "can construct a 50 10 group stage");
  var gs = new GroupStage(50, 10)
    , ms = gs.matches;

  var numGroups = $.maximum(ms.map($.get('id', 's')));
  var numRounds = $.maximum(ms.map($.get('id', 'r')));

  t.equal(numGroups, 5, "should be 5 groups (of 10)");
  t.equal(numRounds, 9, "should be 9 rounds");

  t.equal(ms.length, 5*9*5, "5x9 rounds of (10/2) matches in total");

  t.end();
});

test("upcoming 6 3", function (t) {
  var g = new GroupStage(6, 3);
  // grps == [1,3,6] + [2,4,5]
  $.range(6).forEach(function (n) {
    var up = g.upcoming(n);

    t.ok(up, "found upcoming match for " + n);
    t.equal(up.m, 1, "3p grps => 1 match per round");
    // had group sizes all been even we would verify .r === 1
    t.ok([1, 2].indexOf(up.r) >= 0, "playing at least in one of the first rounds");

    // now verify that n exists in the match and that it's unscored
    var m = g.findMatch(up);
    t.ok(m.p.indexOf(n) >= 0, "player " + n + " exists in .p");
    t.ok(!m.m, "given match was not scored");
  });

  t.end();
});


test("upcoming/scorable 16 8", function (t) {
  t.equal(GroupStage.invalid(16, 4), null, "can construct a 16 4 group stage");
  var g = new GroupStage(16, 4)
    , ms = g.matches;
  // grps == 4 of 4

  $.range(3).forEach(function (r) {
    $.range(16).forEach(function (n) {
      var up = g.upcoming(n);

      t.ok(up, "found upcoming match for " + n);
      t.equal(g.unscorable(up, [1, 0]), null, "given id is scorable");

      // up.r follow loop as everyone plays in each round when group sizes even
      t.equal(up.r, r, "previous round scored all now wait for round" + r);

      // now verify that n exists in the match and that it's unscored
      var m = g.findMatch(up);
      t.ok(m.p.indexOf(n) >= 0, "player " + n + " exists in .p");
      t.ok(!m.m, "given match was not scored");
    });

    // now ensure that scorable works on all ids correctly
    ms.forEach(function (m) {
      if (m.id.r >= r) {
        t.equal(g.unscorable(m.id, [1,0]), null, "unplayed matches scorable");
        t.equal(g.unscorable(m.id, [1,0], true), null, "also when rewriting..");
      }
      else if (m.id.r < r) {
        t.ok(g.unscorable(m.id, [1,0]), "nothing is scorable in the past");
        t.equal(g.unscorable(m.id, [1,0], true), null, "except when rewriting");
      }
    });

    $.range(4).forEach(function (s) { // all 4 groups
      $.range(2).forEach(function (m) { // all 2 matches per group (in this round)
        var id = {s: s, r: r, m: m};
        t.equal(g.unscorable(id, [1,0]), null, "can score " + rep(id));
        t.ok(g.score(id, [1, 0]), "scoring round" + r);
      });
    });

  });

  $.range(16).forEach(function (n) {
    var up = g.upcoming(n);
    t.ok(!up, "no more upcoming matches after 3 rounds played");
  });

  // ensure that nothing is now scorable
  ms.forEach(function (m) {
    var id = rep(m.id);
    t.ok(g.unscorable(m.id, [1,0]), "no matches are now scorable" + id);
    t.equal(g.unscorable(m.id, [1,0], true), null, "unless we rewrite history" + id);
  });

  t.end();
});


test("res test 9 3 without allow map breaks for ties", function (t) {
  var score = function (g, mapsTie, r) {
      g.matches.forEach(function (m) {
        // g.id.s is unique amongst x-placers and sufficient for never-tieing prop.
        var a = mapsTie ? 1 : 4 - m.id.s; // first group have highest score
        if (m.id.r === r) {
          t.equal(g.unscorable(m.id, [a,0]), null, rep(m.id) + " !unscorable");
          t.ok(g.score(m.id, m.p[0] < m.p[1] ? [a,0] : [0,a]), "score " + rep(m.id));
        }
      });
    };

  [true, false].forEach(function (mapsTie) {
    // run these tests twice, once tieing map scores ([1,0] all) snd run [a,0] all
    // where a is variant (here depending on group number for simplicity)
    var g = new GroupStage(9, 3);

    // verify initial conditions
    var res0 = g.results();
    t.ok(res0, "got res0");
    var found = [];
    res0.forEach(function (r) {
      t.equal(r.pos, 9, r.seed + " should be tied with everyone pre-start");
      t.equal(r.wins, 0, r.seed + " should have exactly zero wins pre-start");
      t.equal(r.draws, 0, r.seed + " should have exactly zero draws pre-start");
      t.equal(r.losses, 0, r.seed + " should have exactly zero losses pre-start");
      t.equal(r.maps, 0, r.seed + " should have exactly zero map scrs pre-start");
      t.ok(1 <= r.grp && r.grp <= 3, r.seed + " should have grp stored");
      t.ok(r.gpos !== undefined, r.seed + " should have gpos stored");
      t.ok(r.seed > 0 && r.seed <= 9, "seeds are 1-indexed: " + r.seed);
      t.ok(found.indexOf(r.seed) < 0, "seeds are unique: " + r.seed);
      found.push(r.seed);
    });
    t.equal(found.length, 9, "result length is 9");
    found.forEach(function (f) {
      t.equal(Math.ceil(f), f, "found seed number is an integer: " + f);
    });

    // score rounds one by one and verify that everything ties as expected
    score(g, mapsTie, 1);
    var res1 = g.results();
    t.ok(res1, "got res1");
    res1.forEach(function (r) {
      t.equal(r.pos, 9, "all players are tied at 9th before done");
      t.equal(r.pts, 3*r.wins, "pts are 3x wins (when no draws)");
    });

    score(g, mapsTie, 2);
    var res2 = g.results();
    t.ok(res2, "got res2");
    res2.forEach(function (r) {
      t.equal(r.pos, 9, "all players are tied at 9th before done");
      t.equal(r.pts, 3*r.wins, "pts are 3x wins (when no draws)");
    });

    // score remaining matches, now pos should only tie in a particular situation
    score(g, mapsTie, 3);
    [false, true].forEach(function (mapsBreak) {
      var res3 = g.results({mapsBreak: mapsBreak});
      t.ok(res3, "got res3");
      res3.forEach(function (r) {
        if (r.seed <= 3) { // top 3 (1st-placers)
          if (mapsTie || !mapsBreak) {
            t.equal(r.pos, 1, "1st placers tied at 1st");
          }
          else { // !mapsTie && mapsBreak
            t.equal(r.pos, r.grp, r.seed + " broken by maps (1st placer)");
          }
        }
        else if (r.seed <= 6) { // 2nd-placers
          if (mapsTie || !mapsBreak) {
            t.equal(r.pos, 4, "2nd placers tied at 4th");
          }
          else {
            t.equal(r.pos, 3 + r.grp, r.seed + " broken by maps (2nd placers)");
          }
        }
        else { // 3rd-placers
          t.equal(r.pos, 7, "3rd placers tied at 7th"); // always, because zero score
        }
        t.equal(r.pts, 3*r.wins, "pts are 3x wins (when no draws)");
      });
    });

  });

  t.end();
});
