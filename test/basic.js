var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("group properties", function (t) {
  // TODO: eventually buff these numbers to test all cases..
  var nums = $.range(10)
    , gsizes = $.range(4);

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
          t.equal($.minimum(gsums), $.maximum(gsums), "sum of seeds zero in perfect groups");
        }
      }

    });
  });

  t.end();
});
