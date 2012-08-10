var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , T = require('../');

test("elimination", function (t) {
  // try scoring everything in order
  var gs = T.elimination(5, T.LB);
  gs.forEach(function (g) {
    T.scoreDuel(gs, 3, T.LB, g.id, [0, 1]);
  });

  var lastPls = gs[gs.length-1].p.filter(function (n) {
    return n !== 0;
  });
  t.equal(lastPls.length, 2, "got two players at the end when scoring everything");

  t.end();
});
