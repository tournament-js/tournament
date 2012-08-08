var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("groups", function (t) {
  // TODO: eventually buff these numbers to test all cases..
  var nums = $.range(200)
    , gsizes = $.range(16);

  nums.forEach(function (np) {
    gsizes.forEach(function (s) {
      var grps = T.groups(np, s);
      t.ok($.maximum($.pluck('length', grps)) <= s, "group sizes <= input size");

      var pls = $.flatten(grps);
      t.equal(pls.length, np, "right number of players included");
      t.deepEqual($.difference(pls, $.range(np)), [], "players included once per group");

      if (np % s === 0) {
        var gsums = grps.map($.sum);
        // sum of seeds must differ by at most number of groups in full groups
        t.ok($.minimum(gsums) <= $.maximum(gsums) + grps.length, "sum of seeds in full groups difference");

        if ($.even(s)) {
          // a group is perfect if groups are full and only filled with pairs!
          t.equal($.minimum(gsums), $.maximum(gsums), "sum of seeds zero difference in perfect groups");
        }
      }
    });
  });
  t.end();
});

test("robin", function (t) {
  $.range(20).forEach(function (n) {
    var rs = T.robin(n);
    var expected = ($.odd(n)) ? n : n-1;
    t.equal(expected, rs.length, "correct number of rounds");

    var pMaps = []
    $.range(n).forEach(function (p) {
      pMaps[p] = []
    });

    rs.forEach(function (rnd) {
      t.equal(rnd.length, Math.floor(n/2), "each round has correct number of matches");

      var plrs = $.flatten(rnd);
      t.deepEqual(plrs, $.nub(plrs), "players listed only once per round");

      // keep track of who everyone is playing as well
      rnd.forEach(function (p) {
        var a = p[0]
          , b = p[1];
        pMaps[a].push(b);
        pMaps[b].push(a);
      });
    });

    Object.keys(pMaps).forEach(function (p) {
      var val = pMaps[p].sort($.compare());
      var exp = $.delete($.range(n), Number(p));
      // if this true, then each play all exactly once by previous test
      t.deepEqual(val, exp, "player " + p + " plays every enemy");
    });
  });
  t.end();
});
