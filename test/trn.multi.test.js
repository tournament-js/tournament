var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , Duel = require('duel')
  , Masters = require('masters')
  , GroupStage = require('groupstage')
  , Base = require('../'); // main interface

// test Masters as middle tournament
test("Duel -> Masters -> League", function (t) {
  var duel = new Duel(16);
  duel.matches.forEach(function (m) {
    duel.score(m.id, m.p[1] < m.p[0] ? [1, 0] : [0, 1]); // score inversely to seed
  });
  var top4 = duel.results().slice(0, 4);
  t.deepEqual($.pluck('seed', top4), [16, 15, 14, 13], "winners are bottom 4 seeds");

  var masters = Masters.from(duel, 4, { knockouts: [1] });
  t.ok(masters, 'constructed Masters from finished Duel tournament');
  t.equal(masters.matches.length, 2, "2 matches found");
  t.deepEqual(masters.matches[0].p, [16, 15, 14, 13], "initial match");
  t.deepEqual(masters.matches[1].p, [0,0,0], "second match");

  masters.score(masters.matches[0].id, [4,3,2,1]);
  masters.score(masters.matches[1].id, [3,2,1]);
  t.ok(masters.isDone(), 'masters done');

  var mRes = masters.results();
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
