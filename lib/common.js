var eql = require('deep-equal');

var T = {
  WB : 1
, LB : 2
, WO : -1
, NA : 0
};

// only need to check if a match has the given id, not complete equality
T.byId = function (id, g) {
  return eql(id, g.id);
};

// sorting is chronological like you'd read it: first section, then round, then match number.
T.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

module.exports = T;
