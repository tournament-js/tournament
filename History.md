PLANNED
==================
  * `FFA` elimination crossovers? perhaps using tierbreakers in multi-stage FFA -> FFA
  * `FFA` manual mode by passing in adv array similar to what `KnockOut` does
  * `KnockOut` automatic mode by passing in a constant ko factor
  * group stages should have tiebreaker handling
  * `FFA` best could now be top player score and could also do average.
  * `FFA` results should? tie 4th placers across matches when not proceeding etc

0.5.0 / 2012-XX-XX
==================
  * TODO: All constructors get an optional `limit` option to set how many of the top you would like to extract (so that the tournament can generate tiebreakers if necessary).
  * `Duel` constructor heaps optional flags in the third options object. This used to be a bool only.
  * `Duel` double elimination positions are now accurate mid tournament.

0.4.2 / 2012-11-20
==================
  * `FFA` results now properly accounts for ties
  * `FFA` results now score a win as having progressed to the next match rather than the amount of people below in comparing points then seed (which was bad anyway, did not account for ties) to let wins be consistent with other tournament types.
  * Last 0.4 release. 0.5 Will break constructors.

0.4.1 / 2012-11-18
==================
  * Added KnockOut::upcoming and KnockOut.fromJSON to conform

0.4.0 / 2012-11-17
==================
  * logule version 2 now a peerDependency - install it to use/redirect logs to where you want them (NB: only logs warnings and errors by default)
  * logule on optionalDependencies for travis only atm -- current best found solution
  * `KnockOut` tournaments added - in early stage, but the basics work very well now

0.3.0 / 2012-10-24
==================
  * rewrite `FFA.prototype.results` to count each players `pos` more intelligently:
    - pos always ties at start of round, but will increase at end
    - pos never decreases as a round is played like before
    - pos is calculated across the entire round for the non-advancers (no more ties)
  * code quality improvements

0.2.6 / 2012-10-20
==================
  * use interlude@1.0.0 instead, a few improvements as a consequence
  * remove typr, use Number.isFinite
  * REMOVE NODE 0.6 SUPPORT because ^^
  * use logule@1.1.0

0.2.5 / 2012-10-17
==================
  * logule init fix
  * `isDone` method on all tournament types

0.2.4 / 2012-09-29
==================
  * logging now done via logule to allow people to turn off / filter / style tournament's few warnings

0.2.3 / 2012-09-20
==================
  * gf2 is now optional for double elimination in the same way as bronze winal is optional in single

0.2.2 / 2012-09-17
==================
  * scorable/upcoming methods now takes care of corner cases for good consistency (readme updated)
  * fixed 4 player Duel bug with bronze final loser getting moved to bronze final again

0.2.1 / 2012-09-10
==================
  * fromJSON deserialization now working for all tournament types
  * results for group stage is now working correctly

0.2.0 / 2012-07-24
==================
  * all basic features included: GroupStage, FFA, Duel (double elim and single w/wo bronze final)
  * behaviour split up into one file per one of those things listed above
  * new class abstraction to hide all tournament parameters and allow easy de/serialization

0.1.0 / 2012-07-08
==================
  * Initial buggy version to capture npm namespace
