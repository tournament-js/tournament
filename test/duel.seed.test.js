var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../')
  , rep = T.Duel.idString;


test("seeding assumption", function (t) {
  var d = new T.Duel(512, T.WB, {short:true}) // no need to test with bronze final
    , gs = d.matches;

  var verifyRound = function (r, len) {
    var round = gs.filter(function (m) {
      return m.id.r === r;
    });

    // do a check each round to see that the top `len` are present
    var players = $.flatten($.pluck('p', round)).sort($.compare());
    t.equal(players.length, len, "should be exactly " + len + " players in r" + r);
    t.equal(players.length, $.nub(players).length, "no duplicates found in r" + r);
    t.deepEqual(players, $.range(len), len + " first players in r" + r);

    // score the matches, check that it works given it's such a huge tournament
    // this massively inflates test counts, the roundly ones are the important ones
    round.forEach(function (m) {
      var id = rep(m.id);
      t.equal(d.unscorable(m.id, [1,0]), null, id + " scorable");
      t.ok(d.score(m.id, m.p[0] < m.p[1] ? [1, 0] : [0, 1]), id + " scored");
    });
  };

  var maxr = $.last(gs).id.r;
  $.range(maxr).forEach(function (r, i) {
    var inRound = Math.pow(2, 9 - i); // 512 in first round keep dividing by 2
    verifyRound(r, inRound);
  });

  t.end();
});
