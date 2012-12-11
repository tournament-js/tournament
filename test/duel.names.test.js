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

  var checkMatch = function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === T.LB) {
      t.equal(name, "Bronze final", "Round 1 LB name");
    }
    else {
      switch (r) {
        case 1: t.equal(name, "Round of 32", "Round 1 WB name"); break;
        case 2: t.equal(name, "Round of 16", "Round 2 WB name"); break;
        case 3: t.equal(name, "Quarter-finals", "Round 3 WB name"); break;
        case 4: t.equal(name, "Semi-finals", "Round 4 WB name"); break;
        case 5: t.equal(name, "Grand final", "Round 5 WB name"); break;
        default: t.ok(false, "WB round > 10 in 32 player tournament!?"); break;
      }
    }
  };

  gs.forEach(checkMatch);
  t.end();
});

test("names 32 LB", function (t) {
  var d = new T.Duel(32, T.LB) // using double final
    , gs = d.matches;
  // should be 2*p === LB rounds === 2*5 = 10
  var checkLb = function (r, name) {
    switch (r) {
      case 1: t.equal(name, "LB Round of 16", "Round 1 LB name"); break;
      case 2: t.equal(name, "LB Strong round of 16", "Round 2 LB name"); break;
      case 3: t.equal(name, "LB Round of 8", "Round 3 LB name"); break;
      case 4: t.equal(name, "LB Strong round of 8", "Round 4 LB name"); break;
      case 5: t.equal(name, "LB Round of 4", "Round 5 LB name"); break;
      case 6: t.equal(name, "LB Strong round of 4", "Round 6 LB name"); break;
      // special rounds
      case 7: t.equal(name, "LB Final", "LB round 7 name"); break;
      case 8: t.equal(name, "LB Strong final", "LB final 2 name"); break;
      case 9:
      case 10: t.equal(name, "Grand final", "GF 1 and 2"); break;
      default: t.ok(false, "WB round > 10 in 32 player tournament!?"); break;
    }
  };
  var checkWb = function (r, name) {
    switch (r) {
      case 1: t.equal(name, "WB Round of 32", "Round 1 WB name"); break;
      case 2: t.equal(name, "WB Round of 16", "Round 2 WB name"); break;
      case 3: t.equal(name, "WB Quarter-finals", "Round 3 WB name"); break;
      case 4: t.equal(name, "WB Semi-finals", "Round 4 WB name"); break;
      case 5: t.equal(name, "WB Final", "Round 5 WB name"); break;
      default: t.ok(false, "WB round > 5 in 32 player tournament!?");
    }
  };

  gs.forEach(function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === T.LB) {
      checkLb(r, name);
    }
    else {
      checkWb(r, name);
    }
  });

  t.end();
});
