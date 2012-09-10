var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../')
  , byId = require('../lib/common').byId;

test("group stage 10 6 fromJSON", function (t) {
  var gs = new T.GroupStage(10, 6);
  var gs2 = T.GroupStage.fromJSON(gs.matches);

  t.equal(gs.groupSize, 5, "group size reduced to as insufficient players");

  t.deepEqual(gs.matches, gs2.matches, "matches same");
  t.equal(gs.groupSize, gs2.groupSize, "groupSize recalculated correctly");
  t.equal(gs.numPlayers, gs2.numPlayers, "numPlayers kept correctly");

  gs2.matches.forEach(function (g) {
    t.ok(gs2.score(g.id, [1,0]), "should be able to score all these matches");
  });

  t.end();
});


test("group stage 16 4 fromJSON", function (t) {
  var gs = new T.GroupStage(16, 4);
  var gs2 = T.GroupStage.fromJSON(gs.matches);

  t.deepEqual(gs.matches, gs2.matches, "matches same");
  t.equal(gs.groupSize, gs2.groupSize, "groupSize recalculated correctly");
  t.equal(gs.numPlayers, gs2.numPlayers, "numPlayers kept correctly");

  gs2.matches.forEach(function (g) {
    t.ok(gs2.score(g.id, [1,0]), "should be able to score all these matches");
  });

  t.end();
});

var getGroup = function (ms, g) {
  return ms.filter(function (m) {
    return m.id.s === g;
  });
};

// couple of tests to ensure correct lengths
test("group stage 16 4", function (t) {
  var gs = new T.GroupStage(16, 4)
    , ms = gs.matches;
  // should be 4 rounds, with 3 matches for each player, i.e. 3! matches

  var numGroups = $.maximum(ms.map($.getDeep('id.s')));
  var numRounds = $.maximum(ms.map($.getDeep('id.r')));

  t.equal(numGroups, 4, "should be 4 groups (of 4)");
  t.equal(numRounds, 3, "should be 3 rounds");

  t.equal(ms.length, 4*(3*2), "4x3 rounds of (4/2) matches in total");

  t.end();
});

test("group stage 32 8", function (t) {
  var gs = new T.GroupStage(32, 8)
    , ms = gs.matches;

  var numGroups = $.maximum(ms.map($.getDeep('id.s')));
  var numRounds = $.maximum(ms.map($.getDeep('id.r')));

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
    t.ok(r.grp === undefined, "temporary group property unset");
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
  var gs = new T.GroupStage(50, 10)
    , ms = gs.matches;

  var numGroups = $.maximum(ms.map($.getDeep('id.s')));
  var numRounds = $.maximum(ms.map($.getDeep('id.r')));

  t.equal(numGroups, 5, "should be 5 groups (of 10)");
  t.equal(numRounds, 9, "should be 9 rounds");

  t.equal(ms.length, 5*9*5, "5x9 rounds of (10/2) matches in total");

  t.end();
});

test("upcoming 6 3", function (t) {
  var g = new T.GroupStage(6, 3)
    , ms = g.matches;
  // grps == [1,3,6] + [2,4,5]
  $.range(6).forEach(function (n) {
    var up = g.upcoming(n);

    t.ok(up, "found upcoming match for " + n);
    t.equal(up.m, 1, "3p grps => 1 match per round");
    // had group sizes all been even we would verify .r === 1
    t.ok([1, 2].indexOf(up.r) >= 0, "playing at least in one of the first rounds");

    // now verify that n exists in the match and that it's unscored
    var m = $.firstBy(byId.bind(null, up), ms);
    t.ok(m.p.indexOf(n) >= 0, "player " + n + " exists in .p");
    t.ok(!m.m, "given match was not scored");
  });

  t.end();
});
