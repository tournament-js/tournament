var $ = require('interlude')
  , eql = require('deep-equal');

var T = {
  WB : 1,
  LB : 2,
  WO : -1,
  NA : 0
};

// only need to check if a match has the given id, not complete equality
T.byId = function (id, g) {
  return eql(id, g.id);
};

// sorting is done in the order you'd read it: section -> round -> match number.
T.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

// internal sorting of zipped player array with map score array : zip(g.p, g.m)
// sorts by map score then seed (for looks only) everything ultimately tied by scores
T.compareZip = $.comparing('1', -1, '0', +1);

// how to sort results array (of objects) : by position (then seed for looks)
// TODO: sort by pos, then maps/matchesPlayed? too controversial?
// (previously the sort order on TIES were undefined - even in KO - should tiebreak)
T.compareRes = $.comparing('pos', +1, 'seed', +1);

module.exports = T;

