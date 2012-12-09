var T = require('./common');

var roundNames = [
  "Bronze Final",
  "Grand Final",
  "Semi Finals",
  "Quarter Finals",
  "Round of "
];
// possible to consider both bronze final and grand final as a round of finals
// to do so, pass in an array like the following:
// var roundNames2 = [
//   "Finals",
//   "Finals",
//   "Semis",
//   "Quarters",
//   "Round of "
// ];

// when in double elimination we use these 2
var wbNames = [
  "WB Final",
  "WB Semi Finals",
  "WB Quarter Finals",
  "WB Round of "
];
var lbNames = [
  "Grand Final", // Double Final - could potentially have a different name somewhere
  "Grand Final",
  "LB Final", // 3rd place decider
  "LB Mixed Final", // 4th place decider
  "LB Round of ",
  "LB Mixed Round of "
];

// can take a partial id where everything but the match number is left out
module.exports = function (last, p, partialId, namesL10n) {
  var br = partialId.s
    , r = partialId.r;
  // sanity
  if (!Number.isFinite(r) || r < 1 || [T.WB, T.LB].indexOf(br) < 0) {
    throw new Error("invalid partial id for roundName: " + partialId);
  }
  if (last === T.WB && r > p) {
    throw new Error("invalid round number for " + p + "th power single elim: " + r);
  }
  if (last === T.WB && br >= T.LB && r !== 1) {
    // only bronze final should exist in LB and that's at r === 1
    throw new Error("invalid bracket for " + p + "th power single elim: " + br);
  }
  if (last === T.LB && r > 2*p) {
    throw new Error("invalid round number for " + p + "th power double elim: " + r);
  }

  var names;
  if (last === T.WB) {
    names = namesL10n || roundNames;
    if (br === T.LB) {
      return names[0]; // already know it is not an invalid match
    }
    return (r > p - 3) ? names[p - r + 1] : names[4] + Math.pow(2, p - r + 1);
  }
  // otherwise double elim
  if (br === T.WB) {
    names = namesL10n || wbNames;
    return (r > p - 3) ? names[p - r] : names[3] + Math.pow(2, p - r + 1);
  }
  if (br === T.LB) {
    names = namesL10n || lbNames;
    if (r >= 2*p - 3) {
      return names[2*p - r]; // grand final rounds or LB final
    }

    // Round of %d - where %d is num players left in LB
    if (r % 2 === 1) {
      return names[4] + Math.pow(2, p-(r+1)/2);
    }
    // Mixed round of %d (always the same as the round before because of feeding)
    if (r % 2 === 0) {
      return names[5] + Math.pow(2, p - r/2);
    }
  }
};


