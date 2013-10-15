var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , Duel = require('../duel.js');

test("names 32 WB", function (t) {
  var d = new Duel(32, Duel.WB) // using bronze final
    , gs = d.matches;

  var rounds = $.nub(gs.map($.get('id', 'r'))).sort($.compare());
  // to prove we covered all the bases
  t.deepEqual(rounds, [1,2,3,4, 5], "5 rounds in a 32 player SE tournament");

  var checkMatch = function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === 2) {
      t.equal(name, "Bronze final", "Round 1 LB name");
    }
    else {
      var wbRoundNames = {
        1: "Round of 32",
        2: "Round of 16",
        3: "Quarter-finals",
        4: "Semi-finals",
        5: "Grand final"
      };
      t.ok(wbRoundNames[r], "not in a weird round");
      t.equal(name, wbRoundNames[r], "Round " + r + " WB name");
    }
  };

  gs.forEach(checkMatch);
  t.end();
});

test("names 32 LB", function (t) {
  var d = new Duel(32, Duel.LB) // using double final
    , gs = d.matches;
  // should be 2*p === LB rounds === 2*5 = 10
  var checkLb = function (r, name) {
    var lbRoundNames = {
      1: "LB Round of 16",
      2: "LB Strong round of 16",
      3: "LB Round of 8",
      4: "LB Strong round of 8",
      5: "LB Round of 4",
      6: "LB Strong round of 4",
      // special rounds
      7: "LB Final",
      8: "LB Strong final",
      9: "Grand final",
      10: "Grand final"
    };
    t.ok(lbRoundNames[r], "not in a weird round");
    t.equal(name, lbRoundNames[r], "Round " + r + " LB name");
  };
  var checkWb = function (r, name) {
    var wbRoundNames = {
      1: "WB Round of 32",
      2: "WB Round of 16",
      3: "WB Quarter-finals",
      4: "WB Semi-finals",
      5: "WB Final"
    };
    t.ok(wbRoundNames[r], "not in a weird round");
    t.equal(name, wbRoundNames[r], "Round " + r + " WB name");
  };

  gs.forEach(function (m) {
    var r = m.id.r;
    var name = d.roundName(m.id);
    if (m.id.s === 2) {
      checkLb(r, name);
    }
    else {
      checkWb(r, name);
    }
  });

  t.end();
});
