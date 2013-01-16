var test = require('tap').test
  , $ = require('interlude')
  , T = require('../');

test("gs 9 3 all equal scores - proceed 3", function (t) {
  var gs = new T.GroupStage(9, 3);
  var ms = gs.matches;

  // score so that everyone got exactly one win
  // easy to do by symmetry in this case, reverse score middle match in group
  ms.forEach(function (m){
    gs.score(m.id, (m.id.r === 2) ? [0, 1] : [1, 0]);
  });

  var res = gs.results();
  t.deepEqual($.nub($.pluck('wins', res)), [1], "all players won 1 match");

  var tb = new T.TieBreaker(res, 3);
  var tms = tb.matches;

  t.equal(tms.length, 3, "should only need within TBs");

  var getPsInGroup = function (gNum) {
    var grp = ms.filter(function (m) {
      return m.id.s === gNum;
    });
    return $.nub($.flatten($.pluck('p', grp))).sort($.compare());
  };
  t.deepEqual(tms[0].p, getPsInGroup(1), "r1 tiebreaker contains group 1 players");
  t.deepEqual(tms[1].p, getPsInGroup(2), "r1 tiebreaker contains group 2 players");
  t.deepEqual(tms[2].p, getPsInGroup(3), "r1 tiebreaker contains group 3 players");

  var isAllR1 = tms.map($.get('id', 'r')).every($.eq(1));
  t.ok(isAllR1, "should only have R1 tiebreakers (within groups)");

  t.end();
});

test("gs 9 3 tied only, but fully between - proceed any", function (t) {
  var gs = new T.GroupStage(9, 3);
  var ms = gs.matches;

  // score so that everyone according to seed - ensures no ties within groups
  // but because all groups are identical, we cant pick from one group over another
  ms.forEach(function (m){
    gs.score(m.id, (m.p[0] < m.p[1]) ? [1, 0] : [0, 1]);
  });

  var res = gs.results();
  var wins = $.nub($.pluck('wins', res)).sort($.compare(-1));
  t.deepEqual(wins, [2, 1, 0], "full spectrum of wins");

  $.range(9).forEach(function (n) {
    var tb = new T.TieBreaker(res, n);
    var tms = tb.matches;

    if ([3, 6, 9].indexOf(n) >= 0) {
      t.equal(tms.length, 0, "no TBs when picking equally from each group");
    }
    else {
      t.equal(tms.length, 1, "need between TB R2 when picking non-multiples");
      t.equal(tms[0].id.r, 2, "and it should be in R2");
      t.equal(tms[0].p.length, 3, "and we need to tiebreak 3 players");
      t.ok(tms[0].p.every(Number.isFinite), "every player is a finite number");

      // now sketch out all the different possibilities:
      if (n === 1 || n === 2) {
        t.deepEqual(tms[0].p, [1,2,3], "the 3 needs to be the group winners");
      }
      else if (n === 4 || n === 5) {
        t.deepEqual(tms[0].p, [4,5,6], "the 3 needs to be the 2nd placers");
      }
      else if (n === 7 || n === 8) {
        t.deepEqual(tms[0].p, [7,8,9], "the 3 needs to be the group losers");
      }
      else {
        t.ok(false, "should not be in this case");
      }

    }
  });

  t.end();
});
