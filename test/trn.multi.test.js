var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , Duel = require('duel')
  , Masters = require('masters')
  , FFA = require('ffa')
  , GroupStage = require('groupstage');

// test Masters and League as middle tournaments
test("Duel -> Masters -> League", function (t) {
  var duel = new Duel(16);
  duel.matches.forEach(function (m) {
    duel.score(m.id, m.p[1] < m.p[0] ? [1, 0] : [0, 1]); // score inversely to seed
  });
  var top4 = duel.results().slice(0, 4);
  t.deepEqual($.pluck('seed', top4), [16, 15, 14, 13], "winners are bottom 4 seeds");

  var masters = Masters.from(duel, 4, { knockouts: [1] }); // 2 match tournament
  t.ok(masters, 'constructed Masters from finished Duel tournament');
  t.equal(masters.matches.length, 2, "2 matches found");
  t.deepEqual(masters.matches[0].p, [16, 15, 14, 13], "initial match");
  t.deepEqual(masters.matches[1].p, [0,0,0], "second match");

  masters.score(masters.matches[0].id, [4,3,2,1]);
  masters.score(masters.matches[1].id, [3,2,1]);
  t.ok(masters.isDone(), 'masters done');

  // NB: it is possible here that masters tied fully in the final
  // thus the GroupStage cannot be constructed
  var league = GroupStage.from(masters, 3);

  t.ok(league, 'constructed League from finished Masters tournament');
  t.equal(league.matches.length, 3, "3 matches in a robin(3) league");
  t.deepEqual(league.matches[0].p, [15, 14], "match 1");
  t.deepEqual(league.matches[1].p, [16, 14], "match 2");
  t.deepEqual(league.matches[2].p, [16, 15], "match 3");

  league.score(league.matches[0].id, [0, 1]); // 14 > 15
  league.score(league.matches[1].id, [0, 1]); // 14 > 16
  league.score(league.matches[2].id, [0, 1]); // 15 > 16

  t.ok(league.isDone(), 'league done');
  var lRes = league.results();
  t.equal(lRes.length, 3, "3 players in league");
  t.equal(lRes[0].seed, 14, "14 positioned 1st in league");
  t.equal(lRes[0].pos, 1, "14 got 1st in league");
  t.equal(lRes[1].seed, 15, "15 positioned 2nd in league");
  t.equal(lRes[1].pos, 2, "15 got 2nd in league");
  t.equal(lRes[2].seed, 16, "16 positioned 3rd in league");
  t.equal(lRes[2].pos, 3, "16 got 3rd in league");

  t.end();
});

// test FFA and Duel as middle tournaments
test("Masters -> FFA -> Duel", function (t) {
  var masters = new Masters(16, { knockouts: [2, 2, 2, 2], limit: 6 });
  masters.matches.forEach(function (m) {
    masters.score(m.id,
      // score so lowest seed get highest points
      // this involves reversing after reseed flips their expected bests
      m.id.r === 1 ? $.range(m.p.length) : $.range(m.p.length).reverse()
    );
  });
  var top8 = masters.results().slice(0, 8);
  var expectedTop = [16, 15, 14, 13, 12, 11, 10, 9];
  t.deepEqual($.pluck('seed', top8), expectedTop, "winners are bottom 8 seeds");

  var ffa = FFA.from(masters, 8, { sizes: [4], limit: 4 }); // 2 match tournament
  t.ok(ffa, 'constructed FFA from finished Duel tournament');
  t.equal(ffa.matches.length, 2, "2 matches found");
  t.deepEqual(ffa.matches[0].p, [16, 14, 11, 9], "r1 m1");
  t.deepEqual(ffa.matches[1].p, [15, 13, 12, 10], "r1 m2");

  ffa.score(ffa.matches[0].id, [4,3,2,1]);
  ffa.score(ffa.matches[1].id, [4,3,2,1]);
  t.ok(ffa.isDone(), 'ffa done');

  var duel = Duel.from(ffa, 6, { short: true });
  t.ok(duel, 'constructed Duel from finished FFA tournament');
  t.equal(duel.matches.length, 4+2+1, 'plain single elim tournament with 6p');
  t.deepEqual(duel.matches[0].p, [15, Duel.WO], 'r1 m1');
  t.deepEqual(duel.matches[1].p, [11, 14], 'r1 m2');
  t.deepEqual(duel.matches[2].p, [13, 12], 'r1 m3');
  t.deepEqual(duel.matches[3].p, [Duel.WO, 16], 'r1 m4');

  duel.matches.forEach(function (m) {
    duel.score(m.id, m.p[0] < m.p[1] ? [1, 0] : [0, 1]); // score by seed
  });
  t.ok(duel.isDone(), 'duel done');

  var dRes = duel.results();
  t.equal(dRes.length, 6, '6 elements in results array');
  t.equal(dRes[0].seed, 11, "11 positioned 1st in league");
  t.equal(dRes[0].pos, 1, "14 got 1st in league");
  t.equal(dRes[1].seed, 12, "12 positioned 2nd in league");
  t.equal(dRes[1].pos, 2, "12 got 2nd in league");
  t.equal(dRes[2].seed, 15, "15 positioned 3rd in league");
  t.equal(dRes[2].pos, 3, "15 got 3rd in league");
  t.equal(dRes[3].seed, 16, "16 positioned 4th in league");
  t.equal(dRes[3].pos, 3, "16 got 3rd in league");
  t.equal(dRes[4].seed, 13, "13 positioned 5th in league");
  t.equal(dRes[4].pos, 5, "13 got 5th in league");
  t.equal(dRes[5].seed, 14, "14 positioned 6th in league");
  t.equal(dRes[5].pos, 5, "14 got 5th in league");

  t.end();
});
