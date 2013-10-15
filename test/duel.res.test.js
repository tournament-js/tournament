var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , Duel = require('../duel')
  , rep = Duel.idString;

const WB = Duel.WB;
const LB = Duel.LB;

test("score affects only winner", function (t) {
  var n = 16
    , d = new Duel(n, LB)
    , gs = d.matches;


  var verifyResDiff = function (res, newRes, pX, plusWins) {
    // pX is the modified player
    t.equal(newRes.length, res.length, "always same number of players in res");
    t.equal(res.length, n, "that number is always " + n);
    res.forEach(function (el) {
      var newEls = newRes.filter(function (il) {
        return il.seed === el.seed;
      });
      t.equal(newEls.length, 1, "found corresponding element in newRes");
      var newEl = newEls[0];
      if (pX === el.seed) {
        // only a few things should have changed
        t.equal(el.wins + plusWins, newEl.wins, pX + " win's  === " + plusWins);
      }
      else {
        t.deepEqual(el, newEl, "res element should be identical");
      }
    });
  };

  var res = d.results();
  t.equal(res.length, n, "res has same number of players as input");

  gs.forEach(function (m) {
    // NB: scoring it underdog way to ensure even long GF can be scored
    t.ok(d.score(m.id, [0, 1]), 'could score ' + rep(m.id));
    var newRes = d.results();
    verifyResDiff(res, newRes, m.p[1], 1);
    res = newRes;
  });

  t.end();
});


test("duel results detailed WB 16", function (t) {
  [false, true].forEach(function (shrt) {
    // first runthrough with bronze final, second without
    var duel = new Duel(16, WB, {short: shrt})
      , gs = duel.matches;

    duel.results().forEach(function (r) {
      t.equal(r.pos, 9, "all players guaranteed 9th place (as losers all tie)");
    });

    var scoreRound = function (br, r) {
      gs.forEach(function (g) {
        if (g.id.r === r && g.id.s === br) {
          // let top seed through
          var str = rep(g.id);
          t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
          t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
        }
      });
      var res = duel.results();
      t.ok(res, "results produced for BR" + br + "R" + r);
      return res;
    };

    scoreRound(WB, 1).forEach(function (r) {
      if ([1, 2, 3, 4, 5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, 'winners tie at 5th');
      }
      else {
        t.equal(r.pos, 9, "the rest tied at 9th");
      }
    });

    scoreRound(WB, 2).forEach(function (r) {
      if ([1, 2, 3, 4].indexOf(r.seed) >= 0) {
        if (shrt) {
          t.equal(r.pos, 3, r.seed + ' guaranteed 3rd place');
        }
        else {
          t.equal(r.pos, 4, r.seed + ' guaranteed 4th place');
        }
      }
      else if ([5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of quarters get 5th");
      }
      else {
        t.equal(r.pos, 9, "the rest tied at 9th again");
      }
    });


    scoreRound(WB, 3).forEach(function (r) {
      if ([1, 2].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 2, "finalists guaranteed 2nd");
      }
      else if ([3, 4].indexOf(r.seed) >= 0) {
        if (shrt) {
          // no bronze final => no potential to get 4th
          t.equal(r.pos, 3, "losers tie at 3rd");
        }
        else {
          t.equal(r.pos, 4, 'losers ONLY guaranteed 4th place (not played bf)');
        }
      }
      else if ([5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of quarters get 5th");
      }
      else {
        t.equal(r.pos, 9, "the rest tied at 9th again");
      }
    });

    scoreRound(WB, 4);
    scoreRound(LB, 1).forEach(function (r) {
      if (r.seed <= 3) {
        t.equal(r.pos, r.seed, "everything should be sorted for top 4 now");
      }
      else if (r.seed === 4) {
        if (shrt) {
          t.equal(r.pos, 3, "seed 4 also ties at 3rd as no bf");
        }
        else {
          t.equal(r.pos, r.seed, "4th lost bf");
        }
      }
      else if ([5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of quarters get 5th");
      }
      else {
        t.equal(r.pos, 9, "the rest tied at 9th again");
      }
    });
  });
  t.end();
});

test("duel results detailed LB 8", function (t) {
  [false, true].forEach(function (shrt) {

    // first runthrough with gf2, second without
    var duel = new Duel(8, LB, {short: shrt})
      , gs = duel.matches;

    duel.results().forEach(function (r) {
      t.equal(r.pos, 7, "all players guaranteed 7th place (as losers all tie)");
    });

    var scoreRound = function (br, r, reverse) {
      gs.forEach(function (g) {
        if (g.id.r === r && g.id.s === br) {
          // let top seed through
          var str = rep(g.id);

          // allow rescoring of gf1 and gf2 - checked for separately
          if (!(br === LB && r >= 5)) {
            var reason = duel.unscorable(g.id, [1,0]);
            t.equal(reason, null, "can score " + str);
          }

          var scores = (g.p[0] < g.p[1]) ? [2, 1] : [1, 2];
          if (reverse) {
            scores = scores.reverse();
          }
          t.ok(duel.score(g.id, scores), 'scored' + str);
        }
      });
      var res = duel.results();
      t.ok(res, "results produced for BR" + br + "R" + r);
      return res;
    };

    scoreRound(WB, 1).forEach(function (r) {
      if ([1, 2, 3, 4].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, 'winners tie at 5th');
      }
      else {
        t.equal(r.pos, 7, "the are still guaranteed 7th tie in LB");
      }
    });

    scoreRound(WB, 2).forEach(function (r) {
      if ([1, 2].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 3, "wb finalists guaranteed 3rd");
      }
      else if ([3, 4].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers guaranteed 5th (same as reaching semi)");
      }
      else if ([5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers R1 stay tied at 7th until LBR1 is played");
      }
    });

    scoreRound(LB, 1).forEach(function (r) {
      if ([1, 2].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 3, "wb finalists guaranteed 3rd");
      }
      else if ([3, 4].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers guaranteed 5th (same as reaching semi)");
      }
      else if ([5, 6].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "winners of LBR1 guaranteed 5th now");
      }
      else if ([7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers WBR1 and LBR1 stay tied at 7th");
      }
    });

    scoreRound(LB, 2).forEach(function (r) {
      if ([1, 2].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 3, "wb finalists guaranteed 3rd");
      }
      else if ([3, 4].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 4, "losers guaranteed 4th");
      }
      else if ([5, 6].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of LBR2 finalized their 5th");
      }
      else if ([7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers WBR1 and LBR1 stay tied at 7th");
      }
    });

    scoreRound(LB, 3).forEach(function (r) {
      if ([1, 2].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 3, "wb finalists guaranteed 3rd");
      }
      else if (r.seed === 3) {
        t.equal(r.pos, 3, "LB final winner guaranteed 3rd");
      }
      else if (r.seed === 4) {
        t.equal(r.pos, 4, "losers guaranteed 4th");
      }
      else if ([5, 6].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of LBR2 finalized their 5th");
      }
      else if ([7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers WBR1 and LBR1 stay tied at 7th");
      }
    });

    scoreRound(WB, 3).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 2, "wb final winner guaranteed 2nd");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 3, "wb final loser guaranteed 3rd");
      }
      else if (r.seed === 3) {
        t.equal(r.pos, 3, "early LB final winner guaranteed 3rd");
      }
      else if (r.seed === 4) {
        t.equal(r.pos, 4, "losers guaranteed 4th");
      }
      else if ([5, 6].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of LBR2 finalized their 5th");
      }
      else if ([7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers WBR1 and LBR1 stay tied at 7th");
      }
    });

    scoreRound(LB, 4).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 2, "wb final winner guaranteed 2nd");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 2, "late lb final winner guaranteed 2nd");
      }
      else if (r.seed === 3) {
        t.equal(r.pos, 3, "ealry lb final winner finalizes 3rd");
      }
      else if (r.seed === 4) {
        t.equal(r.pos, 4, "losers guaranteed 4th");
      }
      else if ([5, 6].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, "losers of LBR2 finalized their 5th");
      }
      else if ([7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 7, "losers WBR1 and LBR1 stay tied at 7th");
      }
    });


    // all code below consider whether or not we are in short mode
    var gf2 = $.last(gs); // NB: only last if !shrt, so test for it further down!
    scoreRound(LB, 5).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 1, "gf1 winner (wb final winner) finalizes a 1st");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 2, "gf1 underdog loser finalizes a 2nd");
      }
    });
    if (!shrt) {
      // last is only gf2 in long mode, as gf2 wont exist
      t.deepEqual(gf2.p, [0, 0], "no players should have been advanced");
    }
    // if wb winner wins, we are done regardless of short mode
    t.ok(duel.isDone(), "duel tournament is done (short final)");


    // rescore GF1
    t.ok(duel.unscorable({s:LB, r:5, m:1}, [1,0]), "cannot rewrite GF1");
    // do it anyway - score in reverse order of seeds!
    scoreRound(LB, 5, true).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 2, "gf1 losers (wb final winner) forces gf2");
      }
      else if (r.seed === 2) {
        if (!shrt) {
          t.equal(r.pos, 2, "gf1 underdog winner still unfinalized 2nd");
        }
        else {
          t.equal(r.pos, 1, "gf1 underdog can win in short mode from one game");
        }
      }
    });
    if (!shrt) {
      t.deepEqual($.last(gs).p, [2, 1], "both advanced in underdogs favor now");
    }
    // short mode done, but  otherwise the second map is scored
    t.equal(duel.isDone(), shrt, "duel tournament is now done only if short");


    if (shrt) {
      return; // nothing else to do in this mode
    }

    // score GF2
    t.equal(duel.unscorable(gf2.id, [1,0]), null, "can score gf2 now");
    t.deepEqual(gf2.p, [2, 1], "underdog moved to top");
    t.equal(gf2.id.r, 6, "gf2 in r6");

    scoreRound(LB, 6, true).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 2, "double loss for 1 in gf");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 1, "underdog comeback");
      }
    });
    t.ok(duel.isDone(), "duel tournament is now done");

    // rescore GF2
    t.ok(duel.unscorable(gf2.id, [1,0]), "cannot rescore gf2");
    t.equal(duel.unscorable(gf2.id, [1,0], true), null, "unless allow rewrite");
    // rewrite - score in normal seed order
    scoreRound(LB, 6).forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 1, "double final, but wb winner won overall");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 2, "double final, but underdog lost overall");
      }
    });
    t.ok(duel.isDone(), "duel tournament is now done");

  });
  t.end();
});
