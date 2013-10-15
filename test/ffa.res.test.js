var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , FFA = require('../ffa')


// full test of a 16 4 2 ffa tournament
test("ffa 16 4 2", function (t) {
  var ffa = new FFA(16, [4,4,4], [2,2])
    , gs = ffa.matches;

  t.equal(gs.length, 4 + 2 + 1, "ffa right number of matches");

  // ffaResults init tests
  var res = ffa.results();
  t.equal(res.length, 16, "all players had stats computed before scoring");

  var poss = $.nub($.pluck('pos', res));
  t.equal(poss.length, 1, "all players have same score");
  t.equal(poss[0], 16, "tied at 16"); // wont distinguish across matches

  var winss = $.nub($.pluck('wins', res));
  t.equal(winss.length, 1, "all players have same wins");
  t.equal(winss[0], 0, "all won 0");

  var sums = $.nub($.pluck('sum', res));
  t.equal(sums.length, 1, "all players have same sum");
  t.equal(sums[0], 0, "all sum 0");

  var seedss = $.nub($.pluck('seed', res));
  t.equal(seedss.length, 16, "all different seeds represented");
  t.deepEqual(seedss.sort($.compare()), $.range(16), "should be all 16");

  // check that all players have an upcoming match in round 1
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(up, "upcoming match for " + n + " exists");
    t.equal(up.r, 1, "upcoming match for " + n + " exists in r1");
    t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
  });

  // now score the first round
  $.range(4).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 1, m: m}, [4,3,2,1]), null, "quarter scorable");
    ffa.score({s: 1, r: 1, m: m}, [4, 3, 2, 1]); // in the order of their seeds
  });


  // verify snd round filled in
  t.deepEqual(ffa.players({r:2}), $.range(8), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = ffa.results();
  t.ok(res2, "got results 2");

  res2.forEach(function (p) {
    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "top 4 seeds won their matches (progressed)");
      t.equal(p.pos, 8, "top 8 advances and should be positioned to tie at 8th");
    }
    if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th seed got 2nd in their matches (progressed)");
      t.equal(p.pos, 8, "top 8 advances and should tie at 8th");
    }
    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "9-12th seed got 3nd in their matches");
      t.ok(8 < p.pos && p.pos <= 12, "between sort of non-advancers => 9th to 12th");
    }
    if ([13, 14, 15, 16].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "13-16th seed got 4th in their matches");
      t.ok(12 < p.pos && p.pos <= 16, "between sort of losers  => 13th to 16th");
    }
  });

  // check that top 8 have an upcoming match in round 2, and rest are out
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 8) {
      t.ok(up, "upcoming match for " + n + " exists");
      t.equal(up.r, 2, "upcoming match for " + n + " exists in r2");
      t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up, undefined, "no upcoming r2 match for knocked out p" + n);
    }
  });

  // score r2
  $.range(2).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 2, m: m}, [4,3,2,1]), null, "semi scorable");
    ffa.score({s: 1, r: 2, m: m}, [4, 3, 2, 1]);
  });

    // verify snd round filled in
  t.deepEqual(ffa.players({r:3}), $.range(4), "r3 players are winners of r2");

  var res3 = ffa.results();
  t.ok(res3, "got results 3");

  res3.forEach(function (p) {
    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "top 4 seeds progressed from both their matches");
      t.equal(p.pos, 4, "top 4 advanced to r3 and start out tieing at final 4th");
    }
    if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th got 2nd and 3rd/4th (progressed once)");
      t.ok(4 < p.pos && p.pos <= 8, "between sort of bottom half top eight");
    }

    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "9-12th seed got 3nd in their match");
      t.ok(8 < p.pos && p.pos <= 12, "between sort of non-advancers => 9th to 12th");
    }
    if ([13, 14, 15, 16].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "13-16th seed got 4th in their match");
      t.ok(12 < p.pos && p.pos <= 16, "between sort of losers  => 13th to 16th");
    }
  });

  // check that top 4 have an upcoming match in round 3, and rest are out
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 4) {
      t.ok(up, "upcoming match for " + n + " exists");
      t.equal(up.r, 3, "upcoming match for " + n + " exists in r3");
      t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up, undefined, "no upcoming r3 match for knocked out p" + n);
    }
  });

  // score final
  t.equal(ffa.unscorable({s: 1, r: 3, m: 1}, [4,3,2,1]), null, "final scorable");
  ffa.score({s: 1, r: 3, m: 1}, [4, 3, 2, 1]);
  var res4 = ffa.results();
  t.ok(res4, "got results 4");


  res4.forEach(function (p) {
    if (p.seed === 1) {
      //t.equal(p.wins, 9, "1 won all 3 matches");
      t.equal(p.pos, 1, "1 placed highest");
      t.equal(p.sum, 12, "sum scores for 1: 4 + 4 + 4");
    }
    if (p.seed === 2) {
      //t.equal(p.wins, 8, "2 scored 1, 1, 2");
      t.equal(p.pos, 2, "2 placed 2nd");
      t.equal(p.sum, 11, "sum scores for 2: 4 + 4 + 3");
    }
    if (p.seed === 3) {
      //t.equal(p.wins, 6, "3 scored 1, 2, 3");
      t.equal(p.pos, 3, "3 placed 3rd");
      t.equal(p.sum, 9, "sum scores for 3: 4 + 3 + 2");
    }
    if (p.seed === 4) {
      //t.equal(p.wins, 5, "4 scored 1 2 4");
      t.equal(p.pos, 4, "4 placed 4th");
      t.equal(p.sum, 8, "sum scores for 2: 4 + 3 + 1");
    }

    // older results remain unaffected
    if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th progressed from one match only");
      t.ok(4 < p.pos && p.pos <= 8, "between sort of bottom half top eight");
    }
    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "9-12th seed got 3nd in their match");
      t.ok(8 < p.pos && p.pos <= 12, "between sort of non-advancers => 9th to 12th");
    }
    if ([13, 14, 15, 16].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "13-16th seed got 4th in their match");
      t.ok(12 < p.pos && p.pos <= 16, "between sort of losers  => 13th to 16th");
    }
  });

  // check that no upcoming matches now that final is scored
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(!up, "no upcoming match after final for player " + n);
  });

  gs.forEach(function (m) {
    t.ok(ffa.unscorable(m.id, [4,3,2,1]), "cant score anything after final is done");
  });

  t.end();
});

// full test of a 81 3 1 ffa tournament
test("ffa 81 3 1", function (t) {
  var ffa = new FFA(81, [3,3,3,3], [1,1,1])
    , gs = ffa.matches;

  t.equal(gs.length, 27 + 9 + 3 + 1, "ffa right number of matches");

  // ffaResults init tests
  var res = ffa.results();
  t.equal(res.length, 81, "all players had stats computed before scoring");

  var poss = $.nub($.pluck('pos', res));
  t.equal(poss.length, 1, "all players have same score");
  t.equal(poss[0], 81, "tied at 81");

  var winss = $.nub($.pluck('wins', res));
  t.equal(winss.length, 1, "all players have same wins");
  t.equal(winss[0], 0, "all won 0");

  var sums = $.nub($.pluck('sum', res));
  t.equal(sums.length, 1, "all players have same sum");
  t.equal(sums[0], 0, "all sum 0");

  var seedss = $.nub($.pluck('seed', res));
  t.equal(seedss.length, 81, "all different seeds represented");
  t.deepEqual(seedss.sort($.compare()), $.range(81), "should be all 81");

  // check that all players have an upcoming match in round 1
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(up, "upcoming match for " + n + " exists");
    t.equal(up.r, 1, "upcoming match for " + n + " exists in r1");
    t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
  });

  // now score the first round
  $.range(27).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 1, m: m}, [3,2,1]), null, "scorable R1M" + m);
    ffa.score({s: 1, r: 1, m: m}, [3, 2, 1]); // in the order of their seeds
  });

  // verify snd round filled in
  t.deepEqual(ffa.players({r:2}), $.range(27), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = ffa.results();
  t.ok(res2, "got results 2");

  res2.forEach(function (p) {
    if ($.range(27).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "top 27 seeds won their matches (progressed)");
      t.equal(p.pos, 27, "top 27 advances and should be positioned to tie at 27");
    }
    if ($.range(28, 54).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "28-54th seed got 2nd in their matches (not progressing)");
      t.equal(p.pos, 28, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(55, 81).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "55-81th seed got 3rd in their matches");
      t.equal(p.pos, 55, p.pos + " pos tied for loser " + p.seed);
    }
  });

  // check that top 27 have an upcoming match in round 2, and rest are out
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 27) {
      t.ok(up, "upcoming match for " + n + " exists");
      t.equal(up.r, 2, "upcoming match for " + n + " exists in r2");
      t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up, undefined, "no upcoming r2 match for knocked out p" + n);
    }
  });

  // score r2
  $.range(9).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 2, m: m}, [3,2,1]), null, "scorable R2M" + m);
    ffa.score({s: 1, r: 2, m: m}, [3, 2, 1]);
  });

  // verify snd round filled in
  t.deepEqual(ffa.players({r:3}), $.range(9), "r3 players are winners of r2");

  var res3 = ffa.results();
  t.ok(res3, "got results 3");

  res3.forEach(function (p) {
    if ($.range(9).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "top 9 seeds won their matches twice (progressed twice)");
      t.equal(p.pos, 9, "top 9 advances and should be positioned to tie at 9th");
    }

    if ($.range(10, 18).indexOf(p.seed) >= 0) {
      // these got 1st then 2nd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 2nd (didnt progress)");
      t.equal(p.pos, 10, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(19, 27).indexOf(p.seed) >= 0) {
      // these got 1st then 3rd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 3rd");
      t.equal(p.pos, 19, p.pos + " pos tied for mid player " + p.seed);
    }

    // these should stay the same
    if ($.range(28, 54).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "28-54th seed got 2nd in their matches (didnt progress)");
      t.equal(p.pos, 28, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(55, 81).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "55-81th seed got 3rd in their matches");
      t.equal(p.pos, 55, p.pos + " pos tied for loser " + p.seed);
    }
  });

  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 9) {
      t.ok(up, "upcoming match for " + n + " exists");
      t.equal(up.r, 3, "upcoming match for " + n + " exists in r3");
      t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up, undefined, "no upcoming r3 match for knocked out p" + n);
    }
  });

  // score r3
  $.range(3).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 3, m: m}, [3,2,1]), null, "scorable R3M" + m);
    ffa.score({s: 1, r: 3, m: m}, [3, 2, 1]);
  });

  // verify next round filled in
  t.deepEqual(ffa.players({r:4}), $.range(3), "r4 players are winners of r3");

  var res4 = ffa.results();
  t.ok(res4, "got results 4");

  res4.forEach(function (p) {
    if ($.range(3).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 3, "top3 seeds won all their matches (beat 3x2)");
      t.equal(p.pos, 3, "top 3 advances and should be positioned to tie at 3th");
    }
    if ($.range(4, 6).indexOf(p.seed) >= 0) {
      // these got 1st, 1st then 2nd (out)
      t.equal(p.wins, 2, "4-6th seed got 1st then 2nd");
      t.equal(p.pos, 4, p.pos + " pos tied for mid player " + p.seedP);
    }
    if ($.range(7, 9).indexOf(p.seed) >= 0) {
      // these got 1st, 1st then 3rd (out)
      t.equal(p.wins, 2, "7-9th seed got 1st,1st,3rd");
      t.equal(p.pos, 7, p.pos + " pos tied for mid player " + p.seed);
    }

    // these should stay the same
    if ($.range(10, 18).indexOf(p.seed) >= 0) {
      // these got 1st then 2nd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 2nd");
      t.equal(p.pos, 10, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(19, 27).indexOf(p.seed) >= 0) {
      // these got 1st then 3rd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 3rd");
      t.equal(p.pos, 19, p.pos + " pos tied for mid player " + p.seed);
    }

    if ($.range(28, 54).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "28-54th seed got 2nd in their matches");
      t.equal(p.pos, 28, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(55, 81).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "55-81th seed got 3rd in their matches");
      t.equal(p.pos, 55, p.pos + " pos tied for loser " + p.seed);
    }
  });


  // check that top 27 have an upcoming match in round 2, and rest are out
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 3) {
      t.ok(up, "upcoming match for " + n + " exists");
      t.equal(up.r, 4, "upcoming match for " + n + " exists in r4");
      t.ok(up.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up, undefined, "no r4 match for knocked out p" + n);
    }
  });


  // score gf
  t.equal(ffa.unscorable({s: 1, r: 4, m: 1}, [3,2,1]), null, "gf scorable");
  ffa.score({s: 1, r: 4, m: 1}, [3, 2, 1]);

  t.deepEqual(ffa.findMatches({r:5}), [], "r5 should not exist");

  var res5 = ffa.results();
  t.ok(res5, "got results 5");

  res5.forEach(function (p) {
    if (p.seed === 1) {
      t.equal(p.wins, 4, "seed 1 won all their matches 4x1st");
      t.equal(p.pos, 1, "seed 1 won and should be 1st");
    }
    if (p.seed === 2) {
      t.equal(p.wins, 3, "seed 2 came 1st,1st,1st,2nd");
      t.equal(p.pos, 2, "seed 2 came 2nd");
    }
    if (p.seed === 3) {
      t.equal(p.wins, 3, "seed 3 came 1st,1st,1st,3rd");
      t.equal(p.pos, 3, "seed 3 came 3rd");
    }

    // these should stay the same
    if ($.range(4, 6).indexOf(p.seed) >= 0) {
      // these got 1st, 1st then 2nd (out)
      t.equal(p.wins, 2, "4-6th seed got 1st,1st,2nd");
      t.equal(p.pos, 4, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(7, 9).indexOf(p.seed) >= 0) {
      // these got 1st, 1st then 3rd (out)
      t.equal(p.wins, 2, "7-9th seed got 1st,1st,3rd");
      t.equal(p.pos, 7, p.pos + " pos tied for mid player " + p.seed);
    }

    if ($.range(10, 18).indexOf(p.seed) >= 0) {
      // these got 1st then 2nd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 2nd");
      t.equal(p.pos, 10, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(19, 27).indexOf(p.seed) >= 0) {
      // these got 1st then 3rd (out)
      t.equal(p.wins, 1, "10h-18th seed got 1st then 3rd");
      t.equal(p.pos, 19, p.pos + " pos tied for mid player " + p.seed);
    }

    if ($.range(28, 54).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "28-54th seed got 2nd in their matches");
      t.equal(p.pos, 28, p.pos + " pos tied for mid player " + p.seed);
    }
    if ($.range(55, 81).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "55-81th seed got 3rd in their matches");
      t.equal(p.pos, 55, p.pos + " pos tied for loser " + p.seed);
    }
  });

  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.equal(up, undefined, "tournament over, no no upcoming match for p" + n);
  });

  t.end();
});
