var tap = require('tap')
  , $ = require('interlude')
  , test = tap.test
  , comp = require('../lib/common').compareMatches
  , T = require('../'); // main interface

test("match partitioning Duel", function (t) {
  var d = new T.Duel(8, T.WB);
  t.deepEqual(d.findMatch({s:T.WB, r:1, m:1}),
    { id: { s: 1, r: 1, m: 1 }, p: [ 1, 8 ] },
    "find returns sensible Duel result"
  );
  t.ok(d.findMatch({s:T.LB, r:1, m:1}), "bf exists");
  t.equal(d.findMatch({s:3, r:1, m:1}), undefined, "garbage id does not exist");

  t.deepEqual(d.findMatches({s:T.WB}), d.sections()[0], "WB is WB");
  t.deepEqual(d.findMatches({s:T.LB}), d.sections()[1], "LB is LB");
  t.equal(d.rounds(T.WB).length, 3, "3 rounds in WB");
  t.equal(d.rounds(T.LB).length, 1, "1 round in LB");
  t.equal(d.sections().length, 2, "WB and LB exists");
  t.equal(d.sections(1).length, 2, "Both sections exist in round 1");
  t.equal(d.sections(2).length, 1, "Only WB section exists in round 2");
  t.equal(d.sections(3).length, 1, "Only WB section exists in round 3");
  t.equal(d.sections(4).length, 0, "No data in round 4");
  t.deepEqual(d.findMatches({s:T.WB, r:1}), d.rounds(T.WB)[0], "R1 === R1");
  t.deepEqual(d.findMatches({s:T.WB, r:2}), d.rounds(T.WB)[1], "R2 === R2");
  t.deepEqual(d.findMatches({s:T.WB, r:3}), d.rounds(T.WB)[2], "R3 === R3");

  var len = d.matches.length;
  t.equal(d.findMatchesRanged({s:T.WB}, {s:T.LB}).length, len, "bounds 1");
  t.equal(d.findMatchesRanged({}, {s:T.LB}).length, len, "bounds 2");
  t.equal(d.findMatchesRanged({s:T.WB}).length, len, "bounds 3");
  t.equal(d.findMatchesRanged({s:T.LB}).length, 1, "bounds 4");
  t.equal(d.findMatchesRanged({r:1}).length, len, "bounds 5");
  t.equal(d.findMatchesRanged({}, {r:3}).length, len, "bounds 6");
  t.equal(d.findMatchesRanged({s:T.LB}, {r:1}).length, 1, "bounds 7");
  t.equal(d.findMatchesRanged({r:3}, {r:2}).length, 0, "invalid range 1");
  t.equal(d.findMatchesRanged({s:T.LB}, {s:T.WB}).length, 0, "invalid range 2");
  t.equal(d.findMatchesRanged({s:T.LB, r:3}).length, 0, "out of bounds");

  t.end();
});

test("match partitioning GroupStage", function (t) {
  var gs = new T.GroupStage(16, 4);
  t.deepEqual(gs.findMatch({s:1, r:1, m:1}),
    { id: { s: 1, r: 1, m: 1 }, p: [ 1, 16 ] },
    "find returns sensible GroupStage result"
  );
  t.ok(gs.findMatch({s:4, r:1, m:1}), "4 groups in group stage");
  t.equal(gs.findMatch({s:5, r:1, m:1}), undefined, "so no 5th would exist");
  t.equal(gs.sections().length, 4, "four groups");
  t.equal(gs.sections()[1].length, 6, "six matches in group 1");

  t.deepEqual(gs.findMatches({s:1}), gs.sections()[0], "Group 1 === Group 1");
  t.deepEqual(gs.findMatches({s:2}), gs.sections()[1], "Group 2 === Group 2");
  t.deepEqual(gs.findMatches({s:3}), gs.sections()[2], "Group 3 === Group 3");
  t.deepEqual(gs.findMatches({s:4}), gs.sections()[3], "Group 4 === Group 4");

  t.deepEqual(gs.findMatches({s:3, r:2}), gs.sections(2)[3-1], "G3R2 === G3R2");
  t.deepEqual(gs.findMatches({s:2, r:3}), gs.rounds(2)[3-1], "G2R3 == G2R3");
  t.deepEqual(
    gs.findMatchesRanged({s:2, r: 3}, {s:2, r:3}),
    gs.findMatches({s:2, r:3}),
    "sandwiched G2R3 === G2R3"
  );
  t.deepEqual(
    gs.findMatchesRanged({s:1, r:1}, {s:4, r:1}),
    gs.rounds()[0],
    "G1->G4 R1 === rounds[0]"
  );
  t.deepEqual(
    gs.findMatchesRanged({s:1, r:2}, {s:4, r:3}),
    gs.rounds()[1].concat(gs.rounds()[2]).sort(comp), // this restacks
    "G1->G4 R2->R3 === (rounds[1] ++ rounds[2]).resort"
  );

  t.deepEqual(
    gs.findMatchesRanged({s:3, r:1}, {s:4, r:1}),
    gs.sections(1)[2].concat(gs.sections(1)[3]),
    "G3->G4 R1 === sections(1)[2] ++ sections(1)[3]"
  );
  t.deepEqual(
    gs.findMatchesRanged({s:2, r:1}, {s:2}),
    $.flatten(gs.sections()[1]),
    "G2 R1->R4 === flattenend sections()[1]"
  );

  t.end();
});

test("current and next round Duel", function (t) {
  var rep = T.Duel.idString;
  var scorer = function (m) {
    t.ok(d.score(m.id, m.p[0] < m.p[1] ? [1,0] : [0,1]), "score " + rep(m.id));
  };
  var d = new T.Duel(8, T.WB, {short: true});
  t.deepEqual(d.currentRound(), d.rounds()[0], "current === round 1");
  t.equal(d.currentRound(T.LB), undefined, "no current LB round");
  t.deepEqual(d.nextRound(), d.rounds()[1], "next === round 2");
  t.equal(d.nextRound(T.LB), undefined, "no next LB round");
  d.findMatches({r:1}).forEach(scorer);
  t.deepEqual(d.currentRound(), d.rounds()[1], "current === round 2");
  t.deepEqual(d.nextRound(), d.rounds()[2], "next === round 3");

  // this wont completely score r2
  d.findMatches({s:1, r:2, m:1}).forEach(scorer);
  t.deepEqual(d.currentRound(), d.rounds()[1], "current === round 2");
  t.deepEqual(d.nextRound(), d.rounds()[2], "next === round 3");

  // but this will
  d.findMatches({s:1, r:2, m:2}).forEach(scorer);
  t.deepEqual(d.currentRound(), d.rounds()[2], "current === round 3");
  t.equal(d.nextRound(), undefined, "no next round");

  t.end();
});

test("current and next round GroupStage", function (t) {
  var rep = T.GroupStage.idString;
  var scorer = function (m) {
    t.ok(gs.score(m.id, m.p[0] < m.p[1] ? [1,0] : [0,1]), "score " + rep(m.id));
  };

  var gs = new T.GroupStage(16, 4);
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1, r:1}), "current === G1R1");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:1}), "currentAll R1");

  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:2}), "next === G1R2");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:2}), "nextAll R2");

  // this will update current round for this group but not across groups
  gs.findMatches({s:1, r:1}).forEach(scorer);
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1, r:2}), "current now G1R2");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:1}), "currentAll still R1");
  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:3}), "next now G1R3");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:2}), "nextAll still R2");

  // this will update R1 everywhere though
  gs.findMatchesRanged({s:2, r:1}).forEach(scorer);
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1, r:2}), "current still G1R2");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:2}), "currentAll R2");
  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:3}), "next still G1R3");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:3}), "nextAll now R3");

  // score remaining matches
  gs.findMatchesRanged({r:2}).forEach(scorer);

  // should be no current or nexts now
  t.equal(gs.currentRound(1), undefined, "no current round for group 1 after end");
  t.equal(gs.currentRound(), undefined, "no current round after end");
  t.equal(gs.nextRound(1), undefined, "no next round for group 1 after end");
  t.equal(gs.nextRound(), undefined, "no next round after end");

  t.end();
});

test("player helpers GroupStage", function (t) {
  var gs = new T.GroupStage(16, 4); // 4 groups with 3 rounds in each
  t.equal(gs.matchesFor(1).length, 3, "player 1 battles 3 others in group 1");
  t.deepEqual(gs.players({s:1}), [1, 5, 12, 16], "group 1 players");
  t.equal(gs.players({r:1}).length, 16, "all players play round 1");
  t.equal(8*3, gs.matches.length, "=> gs is 3 rounds of 16/2 matches");
  t.equal(6, gs.findMatches({s:1}).length, "6 matches per round");
  t.equal(6*4, gs.matches.length, "=> gs is 4 rounds of 6 matches");
  t.deepEqual(
    gs.matchesFor(1),
    gs.findMatches({s:1}).filter(function (m) {
      return m.p.indexOf(1) >= 0;
    }),
    "matches for player 1 is a subset of group 1"
  );

  // tests resultsFor
  gs.matches.forEach(function (m) {
    gs.score(m.id, m.p[0] < m.p[1] ? [1,0] : [0,1]);
  });

  var r1 = gs.resultsFor(1);
  t.equal(r1.seed, 1, "resultsFor one is first player");
  t.equal(r1.pos, 1, "player one won all his matches so is tied first");
  t.deepEqual(r1, gs.results()[0], "since results is sorted by seed, first entry");

  var r16 = gs.resultsFor(16);
  t.equal(r16.seed, 16, "resultsFor 16 is player last");
  t.equal(r16.pos, 13, "player one won all his matches so is tied 13th");
  t.deepEqual(r16, gs.results()[15], "since results is sorted by seed, last entry");

  t.end();
});
