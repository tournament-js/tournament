var $ = require('interlude')
  , G = require('./groups');

// TODO: these functions were used in the FFA elimination creation stage
// but FFA now requires fully configured parameters for robustness.
// thus, these are better served in the UI by suggesting new `adv` candidates

/**
 * cost function for changing the number of advancers in fixed group size ffa elim.
 *
 * Changing `adv` is sometimes necessary [in manual mode] when
 * the global `adv` forces matches to be non-full, making it very unfair for the full
 * matches (as they all have to beat one more)
 * This problem is worst when adv the knockout percentage is already low.
 * In some awful cases it can even (under default) force no elimination matches..
 * Adjusting the group size is sometimes possible, but usually more game dependent
 * and sometimes it's just silly. This is better in general.
 *
 * cost uses the following weighted sub-metrics to determine the cost of `adv2`
 * - distance from `adv` (important - as `adv` is what was requested)
 * - how close the groups are to be filled (where +2 off equally bad as -2 off)
 * - how close the implied group size is from the requested if changing adv
 *
 * The cost function is relative to a round - so make a new one each round in ctor.
 */
var cost = function (grs, adv, prevNumGroups) {
  return function (adv2) {
    var advCloseness = Math.abs(adv - adv2)
      , tot = prevNumGroups * adv2   // total players in next group if using adv2
      , numGroups = Math.ceil(tot / grs) // groups in next round
      , grs2 = G.reduceGroupSize(tot, grs, numGroups) // group size next round
      , rem = tot % grs2 // overflow from grs
      , grpFillCloseness = Math.min(Math.abs(rem - grs2), rem)
      , grpCloseness = grs - grs2; // grs >= grs2

    return 2*advCloseness + 1*grpCloseness + 2*grpFillCloseness;
  };
};

/**
 * best adv candidate finder for a given round
 *
 * grs - requested group size
 * adv - requested adv
 * groups - raw G.groups object for the round in question
 * return 1 <= `adv2` < minimum length groups candidate minimizing `cost`
 *
 * If no cand
 */
var best = function (grs, adv, groups) {
  var minsize = $.minimum($.pluck('length', groups));

  // every match must eliminate something => force < minsize
  var advCands = $.range(adv).filter($.lt(minsize));

  // a worst case candidate to ensure non-emptiness in advCands (TODO: necessary?)
  //var guess = Math.max(1, adv - (grs - minsize));
  //if (advCands.indexOf(guess) < 0) {
  //  advCands.unshift(guess);
  //}

  return $.minimumBy($.compare(cost(grs, adv, groups.length)), advCands);
};

module.exports = {
  cost: cost,
  best: best
};
