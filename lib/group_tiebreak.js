var matchReplace = function (ms, ps, tbNum) {
  // replace player ids with the ones in ps
  // set the `id.tb` to the requested one
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    m.id.tb = tbNum;
    // 1 <= p0 and p1 <= ps.length - map them to ps via a deterministic map
    m.p[0] = ps[m.p[0] - 1];
    m.p[1] = ps[m.p[1] - 1];
  }
  return ms;
};

/**
 * FFA tiebreakers
 *
 * creates 2 kind of tiebreakers
 * 1. Within groups (necessary for 2.)
 * 2. Between groups
 *
 * Because of the complexity of having subgroups tie and then redoing sub groupstages
 * with a reduced number is so high, we leave tiebreaking up to the indivudual host.
 *
 * Thus we only provide at most 2 matches for each player:
 * 1. One match FOR EACH GROUP to tiebreak the groups (which are filled if needed)
 * 2. One match for the between groups x-placers tiebreak
 *
 * These matches must be entered scores to represent the actual tiebreaker event.
 * NO SCORES THEREIN CAN TIE.
 * Results (advancers) can be picked from last match (from 2.)
 */

//ids: (using s as irrelevant here or something else or removed)
// 1. {s:s, r:1, m:s} // s because one match per group
// 2. {s:s, r:2, m:1} // round 2 because winners go to next tiebreaker
/*
silly to have groups in second id because they're not meant to be there
and bear no relation to anything

on the other hand s:s fits very well in first
but it's ultimately a 2-round tiebreaker FFA tournament
i.e. new FFA(?, [numTies1*numGroups, numGroups], {limit: limit})
so obv. doesnt quite fit

need to have a function that:
given the number it wants to advance + results
computes the necessary tiebreaker matches for each group first (if required)
(some of which wont exist)
then, once THIS is done it should be able to compute the NEXT tiebreaker OR results
definitely results given that they are usually not needed or at least for next rnd
thus, we need to store results for the original group stage, AND the results
from the merge of groupstage results with R1 tiebreaker results....
*/


/*
too complex to handle tiebreakers automatically
just provide an FFA like match for each tiebreaker

:one match per group for THE within breaker
:one match between for THE between breaker

then people can do as they please..
and it should be easy to interface with as well if done right
*/
