var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../')
  , rep = T.Duel.idString;

test("score affects only winner", function (t) {
  var n = 16
    , d = new T.Duel(n, T.LB)
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


test("duel results detailed WB 8", function (t) {
  [false, true].forEach(function (shrt) {
    // first runthrough with bronze final, second without
    var duel = new T.Duel(16, T.WB, {short: shrt})
      , gs = duel.matches;

    var res = duel.results();
    t.ok(res, "results0 produced");
    res.forEach(function (r) {
      t.equal(r.pos, 9, "all players guaranteed 9th place (as losers all tie)");
    });


    gs.forEach(function (g) {
      if (g.id.r === 1 && g.id.s === T.WB) {
        // let top seed through
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results1 produced");
    res.forEach(function (r) {
      if ([1, 2, 3, 4, 5, 6, 7, 8].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, 'winners tie at 5th');
      }
      else {
        t.equal(r.pos, 9, "the rest tied at 9th");
      }
    });


    gs.forEach(function (g) {
      if (g.id.r === 2 && g.id.s === T.WB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results2 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 3 && g.id.s === T.WB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored ' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results3 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (!g.m) {
        // score last 1/2 matches, final + bf?
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored ' + str);
      }
    });
    var res3 = duel.results();
    t.ok(res3, "results2 produced");
    res3.forEach(function (r) {
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
    var duel = new T.Duel(8, T.LB, {short: shrt})
      , gs = duel.matches;

    var res = duel.results();
    t.ok(res, "results0 produced");
    res.forEach(function (r) {
      t.equal(r.pos, 7, "all players guaranteed 7th place (as losers all tie)");
    });


    gs.forEach(function (g) {
      if (g.id.r === 1 && g.id.s === T.WB) {
        // let top seed through
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for WBR1 produced");
    res.forEach(function (r) {
      if ([1, 2, 3, 4].indexOf(r.seed) >= 0) {
        t.equal(r.pos, 5, 'winners tie at 5th');
      }
      else {
        t.equal(r.pos, 7, "the are still guaranteed 7th tie in LB");
      }
    });


    gs.forEach(function (g) {
      if (g.id.r === 2 && g.id.s === T.WB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for WBR2 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 1 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR1 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 2 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR2 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 3 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR3 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 3 && g.id.s === T.WB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for WBR3 produced");
    res.forEach(function (r) {
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


    gs.forEach(function (g) {
      if (g.id.r === 4 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, g.p[0] < g.p[1] ? [2, 1] : [1, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR4 produced");
    res.forEach(function (r) {
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

    // score gf1 (all code below consider whether or not we are in short mode)
    gs.forEach(function (g) {
      if (g.id.r === 5 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.equal(duel.unscorable(g.id, [1,0]), null, "can score " + str);
        t.ok(duel.score(g.id, [2, 0]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR5 (gf1) produced");
    res.forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 1, "gf1 winner (wb final winner) finalizes a 1st");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 2, "gf1 underdog loser finalizes a 2nd");
      }
    });
    var gf2; // this further down still
    if (!shrt) {
      gf2 = $.last(gs); // last is only gf2 in long mode, as gf2 wont exist
      t.deepEqual(gf2.p, [0, 0], "no players should have been advanced");
    }
    // if wb winner wins, we are done regardless of short mode
    t.ok(duel.isDone(), "duel tournament is done (short final)");


    // overwrite g5
    gs.forEach(function (g) {
      if (g.id.r === 5 && g.id.s === T.LB) {
        var str = rep(g.id);
        t.ok(duel.unscorable(g.id, [1,0]), "cannot score " + str);
        t.ok(duel.score(g.id, [0, 2]), 'scored' + str);
      }
    });
    res = duel.results();
    t.ok(res, "results for LBR5 (gf1) produced");
    res.forEach(function (r) {
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
    // score gf2
    t.equal(duel.unscorable(gf2.id, [1,0]), null, "can score gf2 now");
    t.ok(duel.score(gf2.id, [1, 0]), "could score gf2");
    res = duel.results();
    t.ok(res, "results for LBR6 (gf2) produced");
    res.forEach(function (r) {
      if (r.seed === 1) {
        t.equal(r.pos, 2, "double loss for 1 in gf");
      }
      else if (r.seed === 2) {
        t.equal(r.pos, 1, "underdog comeback");
      }
    });
    t.ok(duel.isDone(), "duel tournament is now done");

    // overwrite gf2
    t.ok(duel.unscorable(gf2.id, [1,0]), "cannot rescore gf2");
    t.equal(duel.unscorable(gf2.id, [1,0], true), null, "unless allow rewrite");
    t.ok(duel.score(gf2.id, [0, 1]), "scored gf2");
    res = duel.results();
    t.ok(res, "results for rescoring LBR6 (gf2) produced");
    res.forEach(function (r) {
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

