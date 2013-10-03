var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');


test("ffa 16 4 2 fromJSON", function (t) {
  t.equal(T.FFA.invalid(16, [4,4,4], [2,2]), null, "can construct 16 4 2 FFA");
  var ffa = new T.FFA(16, [4,4,4], [2,2])
    , gs = ffa.matches;

  var ffa2 = T.FFA.fromJSON(gs);

  t.deepEqual(ffa.matches, ffa2.matches, "matches same");
  t.deepEqual(ffa.advs, ffa2.advs, "advancers recalculated correctly");
  t.equal(ffa.numPlayers, ffa2.numPlayers, "numPlayers kept correctly");

  ffa2.matches.forEach(function (g) {
    t.ok(ffa2.score(g.id, [4,3,2,1]), "should be able to score all these matches");
  });

  t.end();
});

var getMaxLen = function (rnd) {
  return $.maximum($.pluck('length', $.pluck('p', rnd)));
};
var getRnd = function (gs, r) {
  return gs.filter(function (g) {
    return g.id.r === r;
  });
};


// currently will also work if you put [7, 7, 7]
// because group reduction is automatic like before
test("ffa 28 [7, 6, 6] [3, 3]", function (t) {
  t.equal(T.FFA.invalid(28, [7,6,6], [3,3]), null, "can construct 28 7 3 FFA");
  var ffa = new T.FFA(28, [7, 6, 6], [3, 3])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2)
    , r3 = getRnd(gs, 3);

  t.equal(r1.length, 4, "4 full rounds gets all 28 players in r1");
  t.equal(getMaxLen(r1), 7, "4x7 in r1");

  t.equal(r2.length, 2, "4*3=12, proceeding => 2 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "2x6 in r2");

  t.equal(r3.length, 1, "2*3=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.end();
});


// nice layout, 32 8 2 ensure it's right
test("ffa 32 8 2", function (t) {
  t.equal(T.FFA.invalid(32, [8, 8], [2]), null, "can construct 32 8 2 FFA");
  var ffa = new T.FFA(32, [8, 8], [2])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2);

  t.equal(r1.length, 4, "4 full rounds gets all 32 players in r1");
  t.equal(getMaxLen(r1), 8, "4x8 in r1");

  t.equal(r2.length, 1, "4*2=8, proceeding => 1 groups of 8 in r2");
  t.equal(getMaxLen(r2), 8, "1x8 in r2");

  t.end();
});

// nice layout, 25 5 1 ensure it's right
test("ffa 25 5 1", function (t) {
  t.equal(T.FFA.invalid(25, [5, 5], [1]), null, "can construct 25 5 1 FFA");
  var ffa = new T.FFA(25, [5, 5], [1])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2);

  t.equal(r1.length, 5, "5 full rounds gets all 25 players in r1");
  t.equal(getMaxLen(r1), 5, "5x5 in r1");

  t.equal(r2.length, 1, "5*1=5, proceeding => 1 groups of 5 in r2");
  t.equal(getMaxLen(r2), 5, "1x5 in r2");

  t.end();
});

// awful layout: 28 7 3
test("ffa 28 7 3", function (t) {
  t.equal(T.FFA.invalid(28, [7,6,6], [3,3]), null, "can construct 28 7,6,6 3,3 FFA");
  // would work for [7,7,7] also
  t.equal(T.FFA.invalid(28, [7,7,7], [3,3]), null, "can construct 28 7,7,7 3,3 FFA");
  var ffa = new T.FFA(28, [7,6,6], [3,3])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2)
    , r3 = getRnd(gs, 3);

  t.equal(r1.length, 4, "4 full rounds gets all 28 players in r1");
  t.equal(getMaxLen(r1), 7, "4x7 in r1");

  t.equal(r2.length, 2, "4*3=12, proceeding => 2 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "2x6 in r2");

  t.equal(r3.length, 1, "2*3=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.end();
});

// difficult layout: 36 6 3 - reduce advancers for final
test("ffa 28 7 3", function (t) {
  t.equal(T.FFA.invalid(36, [6,6,6], [3,2]), null, "can construct 32 6,6,6 3,2 FFA");
  var ffa = new T.FFA(36, [6,6,6], [3,2])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2)
    , r3 = getRnd(gs, 3);

  t.equal(r1.length, 6, "6 full rounds gets all 36 players in r1");
  t.equal(getMaxLen(r1), 6, "6x6 in r1");

  t.equal(r2.length, 3, "3*6=18, proceeding => 3 groups of 6 in r2");
  t.equal(getMaxLen(r2), 6, "3x6 in r2");

  t.equal(r3.length, 1, "3*2=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.end();
});

// difficult layout: 49 7 3 - reduces advancers for final
test("ffa 49 7 3", function (t) {
  t.equal(T.FFA.invalid(49, [7,7,6], [3,2]), null, "can construct 49 7,7,6 3,2 FFA");
  var ffa = new T.FFA(49, [7,7,6], [3,2])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2)
    , r3 = getRnd(gs, 3);

  t.equal(r1.length, 7, "7 full rounds gets all 49 players in r1");
  t.equal(getMaxLen(r1), 7, "7x7 in r1");

  t.equal(r2.length, 3, "3*7=21, proceeding => 3 groups of 7 in r2");
  t.equal(getMaxLen(r2), 7, "3x7 in r2");

  t.equal(r3.length, 1, "3*2=6 proceeding => 1 group of 6 in r3");
  t.equal(getMaxLen(r3), 6, "1x6 in r3");

  t.end();
});

// advance almost all the players!
test("ffa 16 4 3", function (t) {
  t.equal(T.FFA.invalid(16, [4,4,3,3,4], [3,3,2,2]), null, "can FFA 16 4 3");
  var ffa = new T.FFA(16, [4,4,3,3,4], [3,3,2,2])
    , gs = ffa.matches;

  var r1 = getRnd(gs, 1)
    , r2 = getRnd(gs, 2)
    , r3 = getRnd(gs, 3)
    , r4 = getRnd(gs, 4)
    , r5 = getRnd(gs, 5);

  t.equal(r1.length, 4, "4 rounds gets all 16 players in r1");
  t.equal(getMaxLen(r1), 4, "4x4 in r1");

  t.equal(r2.length, 3, "4*3=12, 3 groups of 4 proceeding");
  t.equal(getMaxLen(r2), 4, "3x4 in r2");

  t.equal(r3.length, 3, "3*3=9, 3 groups of 3 proceeding");
  t.equal(getMaxLen(r3), 3, "3x3 in r3");

  t.equal(r4.length, 2, "2*3=6, 2 groups of 3 proceeding");
  t.equal(getMaxLen(r4), 3, "2x3 in r4");

  t.equal(r5.length, 1, "1*4=4, 1 group of 4 proceeding");
  t.equal(getMaxLen(r5), 4, "1x4 in r5");

  t.end();
});
