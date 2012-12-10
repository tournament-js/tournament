var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');


test("names 32 WB", function (t) {
  var d = new T.Duel(32, T.WB) // using bronze final
    , gs = d.matches;

  var rounds = $.nub(gs.map($.get('id', 'r'))).sort($.compare());
  // to prove we covered all the bases
  t.deepEqual(rounds, [1,2,3,4, 5], "5 rounds in a 32 player SE tournament");

  gs.forEach(function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === T.LB) {
      t.equal(name, "Bronze final", "Round 1 LB name");
    }
    else {
      if (r === 1) {
        t.equal(name, "Round of 32", "Round 1 WB name");
      }
      if (r === 2) {
        t.equal(name, "Round of 16", "Round 2 WB name");
      }
      if (r === 3) {
        t.equal(name, "Quarter-finals", "Round 3 WB name");
      }
      if (r === 4) {
        t.equal(name, "Semi-finals", "Round 4 WB name");
      }
      if (r === 5) {
        t.equal(name, "Grand final", "Round 5 WB name");
      }
    }
  });

  t.end();
});

test("names 32 LB", function (t) {
  var d = new T.Duel(32, T.LB) // using double final
    , gs = d.matches
    , p = d.p; // should be 2*p === lb rounds === 2*5 = 10


  gs.forEach(function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === T.LB) {
      // normal rounds
      if (r === 1) {
        t.equal(name, "LB Round of 16", "Round 1 LB name");
      }
      else if (r === 2) {
        t.equal(name, "LB Strong round of 16", "Round 2 LB name");
      }
      else if (r === 3) {
        t.equal(name, "LB Round of 8", "Round 3 LB name");
      }
      else if (r === 4) {
        t.equal(name, "LB Strong round of 8", "Round 4 LB name");
      }
      else if (r === 5) {
        t.equal(name, "LB Round of 4", "Round 5 LB name");
      }
      else if (r === 6) {
        t.equal(name, "LB Strong round of 4", "Round 6 LB name");
      }
      // special rounds
      else if (r === 2*p - 3) { // 7
        t.equal(name, "LB Final", "LB round 7 name (4th place ko match)");
      }
      else if (r === 2*p - 2) { // 8
        t.equal(name, "LB Strong final", "LB Final name (3rd place ko match)");
      }
      else if (r === 2*p || r === 2*p - 1) { // 9 and 10
        t.equal(name, "Grand final", "GF round 1 or 2");
      }
      else {
        // to prove we covered all rounds in LB
        t.ok(false, "WB round > 10 in 32 player tournament!?");
      }
    }
    else {
      if (r === 1) {
        t.equal(name, "WB Round of 32", "Round 1 WB name");
      }
      else if (r === 2) {
        t.equal(name, "WB Round of 16", "Round 2 WB name");
      }
      else if (r === 3) {
        t.equal(name, "WB Quarter-finals", "Round 3 WB name");
      }
      else if (r === 4) {
        t.equal(name, "WB Semi-finals", "Round 4 WB name");
      }
      else if (r === 5) {
        t.equal(name, "WB Final", "Round 5 WB name");
      }
      else {
        // to prove we covered all rounds in WB
        t.ok(false, "WB round > 5 in 32 player tournament!?");
      }
    }
  });

  t.end();
});
