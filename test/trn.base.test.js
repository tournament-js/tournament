var $ = require('interlude')
  , Base = require(process.env.TOURNAMENT_COV ? '../lib-cov/tournament' : '../')
  , comp = Base.compareMatches;

var scoreHacker = function (m) {
  m.m = m.p[0] < m.p[1] ? [1,0] : [0,1];
};

exports.defaultFlow = function (t) {
  var Tmp = Base.sub('Fake', function (opts, initParent) {
    t.equal(opts.hi, 'there', 'defaults gets called on opts');
    initParent([]);
    t.done();
  });
  Tmp.configure({
    defaults: function (np, opts) {
      return { hi: 'there' };
    }
  });
  t.deepEqual(Tmp.defaults(5), { hi: 'there' }, 'specified defaults exists');

  new Tmp(2); // calls t.done() - NB: no invalid implementation so passes that too
};

exports.mockDuel = function (t) {
  var Duel = Base.sub('FakeDuel', function (opts, initParent) {
    // to avoid deps, just give out some normal looking Duel matches
    // but pre-progressed, because we aren't testing that
    initParent([
      { id: { s: 1, r: 1, m: 1 }, p: [ 1, 8 ] },
      { id: { s: 1, r: 1, m: 2 }, p: [ 5, 4 ] },
      { id: { s: 1, r: 1, m: 3 }, p: [ 3, 6 ] },
      { id: { s: 1, r: 1, m: 4 }, p: [ 7, 2 ] },
      { id: { s: 1, r: 2, m: 1 }, p: [ 1, 4 ] },
      { id: { s: 1, r: 2, m: 2 }, p: [ 3, 2 ] },
      { id: { s: 1, r: 3, m: 1 }, p: [ 1, 2 ] },
      { id: { s: 2, r: 1, m: 1 }, p: [ 4, 3 ] }
    ]);
  });

  t.equal(Duel.invalid, undefined, "Duel.invalid does not exist yet");
  t.equal(Duel.defaults, undefined, "Duel.defaults does not exist yet");
  Duel.configure({ invalid: function (np, opts) {
      if (np !== 8) {
        return "This is a stupid 8p implementation only";
      }
      return null;
    }
  });
  t.equal(Duel.invalid(), "numPlayers must be a finite integer", "invalid flow");
  t.deepEqual(Duel.defaults(), {}, "configure creates blank obj default fn");

  try {
    new Duel(5);
  }
  catch (e) {
    var exp = "Cannot construct FakeDuel: "  + Duel.invalid(4);
    t.equal(e.message, exp, "invalid throws with invReason using Klass.name");
  }

  var d = new Duel(8);
  const WB = 1;
  const LB = 2;


  // 1. match partitioning helpers
  t.deepEqual(d.findMatch({s:WB, r:1, m:1}),
    { id: { s: 1, r: 1, m: 1 }, p: [ 1, 8 ] },
    "find returns sensible Duel result"
  );
  t.ok(d.findMatch({s:LB, r:1, m:1}), "bf exists");
  t.equal(d.findMatch({s:3, r:1, m:1}), undefined, "garbage id does not exist");

  t.deepEqual(d.findMatches({s:WB}), d.sections()[0], "WB is WB");
  t.deepEqual(d.findMatches({s:LB}), d.sections()[1], "LB is LB");
  t.equal(d.rounds(WB).length, 3, "3 rounds in WB");
  t.equal(d.rounds(LB).length, 1, "1 round in LB");
  t.equal(d.sections().length, 2, "WB and LB exists");
  t.equal(d.sections(1).length, 2, "Both sections exist in round 1");
  t.equal(d.sections(2).length, 1, "Only WB section exists in round 2");
  t.equal(d.sections(3).length, 1, "Only WB section exists in round 3");
  t.equal(d.sections(4).length, 0, "No data in round 4");
  t.deepEqual(d.findMatches({s:WB, r:1}), d.rounds(WB)[0], "R1 === R1");
  t.deepEqual(d.findMatches({s:WB, r:2}), d.rounds(WB)[1], "R2 === R2");
  t.deepEqual(d.findMatches({s:WB, r:3}), d.rounds(WB)[2], "R3 === R3");

  var len = d.matches.length;
  t.equal(d.findMatchesRanged({s:WB}, {s:LB}).length, len, "bounds 1");
  t.equal(d.findMatchesRanged({}, {s:LB}).length, len, "bounds 2");
  t.equal(d.findMatchesRanged({s:WB}).length, len, "bounds 3");
  t.equal(d.findMatchesRanged({s:LB}).length, 1, "bounds 4");
  t.equal(d.findMatchesRanged({r:1}).length, len, "bounds 5");
  t.equal(d.findMatchesRanged({}, {r:3}).length, len, "bounds 6");
  t.equal(d.findMatchesRanged({s:LB}, {r:1}).length, 1, "bounds 7");
  t.equal(d.findMatchesRanged({r:3}, {r:2}).length, 0, "invalid range 1");
  t.equal(d.findMatchesRanged({s:LB}, {s:WB}).length, 0, "invalid range 2");
  t.equal(d.findMatchesRanged({s:LB, r:3}).length, 0, "out of bounds");


  // 2. current and next round helpers
  t.deepEqual(d.currentRound(), d.rounds()[0], "current === round 1");
  var lbMs = d.findMatches({s:LB});
  t.deepEqual(d.currentRound(LB), lbMs, "current LB round is the only one");
  t.deepEqual(d.nextRound(), d.rounds()[1], "next === round 2");
  t.equal(d.nextRound(LB), undefined, "no next LB round");

  // check upcoming as well before we score
  var p1ms = [
    { id: { s: 1, r: 1, m: 1 }, p: [ 1, 8 ] },
    { id: { s: 1, r: 2, m: 1 }, p: [ 1, 4 ] },
    { id: { s: 1, r: 3, m: 1 }, p: [ 1, 2 ] } ]
  t.deepEqual(d.upcoming(1), p1ms, "matches for p1 at start");

  d.findMatches({r:1}).forEach(scoreHacker);
  t.deepEqual(d.currentRound(), d.rounds()[1], "current === round 2");
  t.deepEqual(d.nextRound(), d.rounds()[2], "next === round 3");

  // this wont completely score r2
  d.findMatches({s:1, r:2, m:1}).forEach(scoreHacker);
  t.deepEqual(d.currentRound(), d.rounds()[1], "current === round 2");
  t.deepEqual(d.nextRound(), d.rounds()[2], "next === round 3");

  // but this will
  d.findMatches({s:1, r:2, m:2}).forEach(scoreHacker);
  t.deepEqual(d.currentRound(), d.rounds()[2], "current === round 3");
  t.equal(d.nextRound(), undefined, "no next round");

  // check that upcoming now filters played matches
  t.deepEqual(d.upcoming(1), [p1ms[2]], "only one match left for p1");

  d.findMatches({s:1, r:3}).forEach(scoreHacker);
  t.deepEqual(d.upcoming(1), [], "no matches left for p1");

  t.done();
};


exports.mockGroupStage = function (t) {
  var GS = Base.sub('FakeGroupStage', function (opts, initParent) {
    // 16 players in groups of 4 like match list
    initParent([
      { id: { s: 1, r: 1, m: 1 }, p: [ 1, 16 ] },
      { id: { s: 1, r: 1, m: 2 }, p: [ 5, 12 ] },
      { id: { s: 1, r: 2, m: 1 }, p: [ 1, 12 ] },
      { id: { s: 1, r: 2, m: 2 }, p: [ 16, 5 ] },
      { id: { s: 1, r: 3, m: 1 }, p: [ 1, 5 ] },
      { id: { s: 1, r: 3, m: 2 }, p: [ 12, 16 ] },
      { id: { s: 2, r: 1, m: 1 }, p: [ 2, 15 ] },
      { id: { s: 2, r: 1, m: 2 }, p: [ 6, 11 ] },
      { id: { s: 2, r: 2, m: 1 }, p: [ 2, 11 ] },
      { id: { s: 2, r: 2, m: 2 }, p: [ 15, 6 ] },
      { id: { s: 2, r: 3, m: 1 }, p: [ 2, 6 ] },
      { id: { s: 2, r: 3, m: 2 }, p: [ 11, 15 ] },
      { id: { s: 3, r: 1, m: 1 }, p: [ 3, 14 ] },
      { id: { s: 3, r: 1, m: 2 }, p: [ 7, 10 ] },
      { id: { s: 3, r: 2, m: 1 }, p: [ 3, 10 ] },
      { id: { s: 3, r: 2, m: 2 }, p: [ 14, 7 ] },
      { id: { s: 3, r: 3, m: 1 }, p: [ 3, 7 ] },
      { id: { s: 3, r: 3, m: 2 }, p: [ 10, 14 ] },
      { id: { s: 4, r: 1, m: 1 }, p: [ 4, 13 ] },
      { id: { s: 4, r: 1, m: 2 }, p: [ 8, 9 ] },
      { id: { s: 4, r: 2, m: 1 }, p: [ 4, 9 ] },
      { id: { s: 4, r: 2, m: 2 }, p: [ 13, 8 ] },
      { id: { s: 4, r: 3, m: 1 }, p: [ 4, 8 ] },
      { id: { s: 4, r: 3, m: 2 }, p: [ 9, 13 ] }
    ]);
  });
  GS.configure({ invalid: $.constant(null) });

  var gs = new GS(16, { groupSize: 4 }); // NB: options irrelevant now


  // 1. match partitioning helpers
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


  // 2. player helpers
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

  $.range(16).forEach(function (n) {
    t.equal(gs.resultsFor(n).seed, n, "resultsFor " + n);
  });


  // 3. current and next round helpers
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1, r:1}), "current === G1R1");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:1}), "currentAll R1");

  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:2}), "next === G1R2");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:2}), "nextAll R2");

  // this will update current round for this group but not across groups
  gs.findMatches({s:1, r:1}).forEach(scoreHacker);
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1, r:2}), "current now G1R2");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:1}), "currentAll still R1");
  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:3}), "next now G1R3");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:2}), "nextAll still R2");

  // this will update R1 everywhere though
  gs.findMatchesRanged({s:2, r:1}).forEach(scoreHacker);
  t.deepEqual(gs.currentRound(1), gs.findMatches({s:1,r:2}), "current still G1R2");
  t.deepEqual(gs.currentRound(), gs.findMatches({r:2}), "currentAll R2");
  t.deepEqual(gs.nextRound(1), gs.findMatches({s:1, r:3}), "next still G1R3");
  t.deepEqual(gs.nextRound(), gs.findMatches({r:3}), "nextAll now R3");

  // score remaining matches
  gs.findMatchesRanged({r:2}).forEach(scoreHacker);

  // should be no current or nexts now
  t.equal(gs.currentRound(1), undefined, "no current round for group 1 after end");
  t.equal(gs.currentRound(), undefined, "no current round after end");
  t.equal(gs.nextRound(1), undefined, "no next round for group 1 after end");
  t.equal(gs.nextRound(), undefined, "no next round after end");


  t.done();
};

