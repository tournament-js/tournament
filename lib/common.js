// common includes the publically exported constants and helpers
// as well as the internal sort helpers
var helpers = require('./public');

// only merge in public helpers so we dont accidentally expose these as well
var T = {};
Object.keys(helpers).forEach(function (key) {
  T[key] = helpers[key];
});


// to ensure first matches first and (for most part) forEach scorability
// score section desc, else round desc, else match number desc
// similarly how it's read in many cases: WB R2 G3
T.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

// internal sorting of zipped player array with map score array : zip(g.p, g.m)
// sorts by map score desc, then seed asc
T.compareZip = function (z1, z2) {
  return (z2[1] - z1[1]) || (z1[0] - z2[0]);
};

// how to sort results array (of objects) : by position desc (or seed asc for looks)
// only for sorting (more advanced `pos` algorithms may be used separately)
T.compareRes = function (r1, r2) {
  return (r1.pos - r2.pos) || (r1.seed - r2.seed);
};

module.exports = T;
