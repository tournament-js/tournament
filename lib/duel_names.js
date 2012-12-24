/**
 * roundNames UI helper function for Duel tournaments - localized to English
 *
 * It's possible to allow full localization, but it would require more work.
 * In particular, rounds like 'Round of 8/16' is called '8ths/16ths Finals' in other
 * countries, whereas we just hard coded them as string + Math.pow(2, x).
 *
 * It is therefore possible this should be moved out of tournament and be mixed in
 * by the user of- rather than the module itself given the customizations needed.
 * Sensible defaults is the only reason for keeping it inside tournament.
 */

var seNames = [
  "Bronze final", // bronze final match is sometimes parts of the 'finals' round
  "Grand final",  // often called just the 'Final'
  "Semi-finals",
  "Quarter-finals",
  "Round of "
];

// when in double elimination we use these 2
var wbNames = [
  "WB Final",
  "WB Semi-finals",
  "WB Quarter-finals",
  "WB Round of "
];
var lbNames = [
  "Grand final",          // Strong grand final - but spoiler by prefixing Strong
  "Grand final",          // Potentially last game
  "LB Strong final",      // 3rd place decider
  "LB Final",             // 4th place decider
  "LB Round of ",         // first time there's X in LB
  "LB Strong round of "   // last time there's X in LB
];

// can take a partial id where everything but the match number is left out
// passed in T is a limited object that gets passed in via the in-mixer
var roundName = function (T, last, p, partialId) {
  var br = partialId.s
    , r = partialId.r;

  // sanity
  if (!Number.isFinite(r) || r < 1 || [T.WB, T.LB].indexOf(br) < 0) {
    throw new Error("invalid partial id for roundName: " + partialId);
  }
  var invWB = (br === T.WB && r > p)
    , invSeLB = (last === T.WB && br >= T.LB && r !== 1)
    , invDeLB = (last === T.LB && r > 2*p);

  if (invWB || invSeLB || invDeLB) {
    var str = "br=" + br + ", last=" + last;
    throw new Error("invalid round number " + r + " given for elimination: " + str);
  }

  if (last === T.WB) {
    if (br === T.LB) {
      return seNames[0]; // already know it is not an invalid match
    }
    return (r > p - 3) ? seNames[p - r + 1] : seNames[4] + Math.pow(2, p - r + 1);
  }
  // otherwise double elim
  if (br === T.WB) {
    return (r > p - 3) ? wbNames[p - r] : wbNames[3] + Math.pow(2, p - r + 1);
  }
  if (br === T.LB) {
    if (r >= 2*p - 3) {
      return lbNames[2*p - r]; // grand final rounds or LB final
    }

    // Round of %d - where %d is num players left in LB
    if (r % 2 === 1) {
      return lbNames[4] + Math.pow(2, p-(r+1)/2);
    }
    // Mixed round of %d (always the same as the round before because of feeding)
    return lbNames[5] + Math.pow(2, p - r/2);
  }
};

// export a function to perform mixin
module.exports = function (T) {
  return function (partialId) {
    return roundName(T, this.last, this.p, partialId);
  };
};
