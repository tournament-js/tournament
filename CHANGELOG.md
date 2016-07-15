3.2.0 / 2016-07-15
===================
  * Expose a `metadata` getter method, and allow `restore` to take its output as input - fixes #32

3.1.1 / 2015-12-06
===================
  * Unbreak subclasses of implementations - better `_opts` fix

3.1.0 / 2015-12-06
===================
 * `_opts` is no longer enumerable
 * `Tournament.defaults` now configures a `log` object (default `console` if unset)

3.0.0 / 2014-10-11
===================
 * Remove `Klass.parse` and `toString` on all implementations

3.0.0-0 / 2014-10-11
===================
  * Add public `.state` member on instance (doesn't clash with implementations on npm)
  * Create `Klass.state` to allow implementation to replay from `.state`
  * Migration release (the real breaking change comes in next) [so you can get `.state`]

2.4.0 / 2014-10-06
===================
  * `opts` now always stored on instance as `_opts`

2.3.0 / 2014-10-05
===================
  * `Tournament.from` is exposed for `Tourney` - the undelying helper for `Klass.from`

2.2.0 / 2014-10-02
===================
  * `SubClass.prototype._safe` will now be used to improve non-`allowPast` scoring

2.1.0 / 2014-10-01
===================
  * Expose `Tournament.configure` the underlying helper used to create `Klass.configure`
  * `Tournament.sub` now correctly calls `Initial.inherit` rather than `Tournament.inherit`

2.0.1 / 2014-09-30
===================
  * Bump interlude to 1.1.0
  * Fix bug where `initResult` would give out references to previous objects

2.0.0 / 2014-09-14
===================
  * *BREAKING*: `upcoming` now returns all upcoming matches rather than the first id
  * Removed `_limbo` call-in
  * tourney can now use `tournament/lib/match` instead of manually copying this
  * undocumented and private Tournament::_replace is now encapsulated away fully

1.0.0 / 2014-09-01
===================
  * Added coverage
  * `Tournament.idString` static removed
  * `Tournament::rep` member function removed (was always undocumented)
  * Custom `idString` implementations CAN be attached to the Id's `toString` method
  * Major bump for satisfaction

0.21.0 / 2013-12-23
===================
  * Every `Tournament` instance is now an `EventEmitter` that emits `score` events.

0.20.4 / 2013-11-24
===================
  * Fixed an issue that caused .sub constructors to modify input options
    (could cause complications when reusing the same input options)

0.20.3 / 2013-11-13
===================
  * **TL;DR** `invalid` behaviour was wrong:
    - Fixed a bug that caused the invalid inheritance chain to cause `(n)+(n-1)+...+1` calls to various invalid functions when constructing (should just be `n`)
    - `configured invalid` now checks that `numPlayers` is an integer then calls its the specified invalid. If inheritance exists, the lower `invalid` will trigger when you call the super class.

0.20.2 / 2013-11-13
===================
  * Fixed a bug that screwed up inheriting from implementation

0.20.1 / 2013-11-13
===================
  * `results[i].against` now expected everywhere
  * `Base.matchTieCompute` and `Base.resTieCompute` added

0.20.0 / 2013-11-06
===================
  * Clearly distinguish what is implementors functions and user facing interface
  * all expected prototype implementations are now prefixed with a _
  * `_stats` split up into `_stats` and `_sort`
  * replace is now _replace (internal, but perhaps useful for subs)

0.19.0 / 2013-11-02
===================
  * fixed bug in Base::players that caused WO markes to be included
  * Base.from allows overridable implementation of multistage (but default implementation works for all but TieBreaker)
  * `stats` implementations must not use results as a lookup map anymore - use `Base.resultEntry`

0.18.0 / 2013-10-31
===================
  * `.sub` made much easier to use for implementors
  * `.configure` MUST be called with static `defaults` and `invalid`
  * `defaults` will be used to fill in parameter defaults

0.17.1 / 2013-10-27
===================
  * `initResult` now optional when no extra properties are computed

0.17.0 / 2013-10-25
===================
  * Added `Base.isInteger` while ES6 is not out
  * TOURNAMENTS MUST NO LONGER OVERRIDE `results` (straggler from 0.16):
  * Instead implement `stats` and `initResult`
  * Results consistency enforced:
    - `maps` and `sum` keys removed across tournaments
    - `for` and `against` keys have been added across tournaments - fixes #12

0.16.0 / 2013-10-22
===================
  * TOURNAMENTS MUST NO LONGER OVERRIDE `score`, `unscorable`, `upcoming` or `isDone`
  * Following documented in the [implementors guide](./doc/implementors.md)
    - `Base.parse` MUST NOT be bound anymore to avoid subclassing failing after the first
    - `Base.sub` makes inheriting and implementing a tournament much easier
    - Implement `verify` and `progress` for shorter unscorable and score additions
    - Implement `early` and `limbo` for better isDone and upcoming additions

0.15.1 / 2013-10-17
===================
  * tests now remaining - now tests consistency of the 4 factored out modules
  * `isPlayable` now used in `unscorable` for consistency
  * `Base.sorted` gets the sorted player array of a match by `Base.compareZip`


0.15.0 / 2013-10-15
===================
  * tournament no longer exports any tournament types, but only the `Base` class
  * see modules:
   - [duel](https://npmjs.org/package/duel)
   - [ffa](https://npmjs.org/package/ffa)
   - [groupstage](https://npmjs.org/package/groupstage)
   - [masters](https://npmjs.org/package/masters)

=======================================
# BEFORE THIS MODULE WAS INTERFACE ONLY
=======================================

0.14.0 / 2013-10-15
===================
  * `new` protection for all subclasses
  * `fromJSON` remoted, use version "0.13.0" to migrate to the full string

0.13.0 / 2013-10-15
===================
  * Exposed `Base` class for external implementors (with extra entry point for just this)
  * Base class implements a default `score` - now used by `GroupStage`
  * Serialization now uses `inst.toString()` and `Klass.parse(str)`
  * Migration to new format should be done THROUGH this version, `fromJSON` will be gone in next (you MUST also set `trn.version = 1` on your instance)
  * `WB`, `LB` and `WO` now only available on `Duel` class not on every entry point.
  * `NA` constant removed - instead added `trn.isPlayable(match)` helper


0.12.0 / 2013-10-02
===================
  * Added a bunch of helper methods on a common base class
  * helper `t.findMatch(d.matches, id)` changed to be avilable on instance `d.findMatch(id)`
  * Instance method `d.findMatches(partialId)` added to find a set of "similar" matches
  * Added instance methods `section()` and `rounds()` to help partition the `matches` array
  * Bunch of default helper methods added on the base class see `base.md` in the doc dir

0.11.1 / 2013-02-04
===================
  * removed spurious console.log in `TieBreaker`
  * added a doc/ for this `TieBreaker` class

0.11.0 / 2013-02-04
===================
  * removed `logule` dependency - error messages can be provided by helpers completely now
  so it's unnecessary to break browserification
  * `TieBreaker` module included for (currently only `GroupStage`) `limit` like functionality (docs to come) for tiebreaking all the possible ties possible in GroupStage
  * removed `deep-equal` dependency (overkill solution)
  * reduced 3 player restriction on `GroupStage` to 3 (for tiebreaker scenario)
  * reduced 3 player restriction on `FFA` to 2 (for tiebreaker scenario)
  * (2 player `GroupStage` is equivalent to a 2 player `FFA` so further reduction unnecessary)

0.10.3 / 2012-12-24
===================
  * `FFA` restrictions on `limit` removed (apart from multiple of last rounds numMatches)
  * publically exported helpers now include `findMatch` :: matches -> id -> match
  * `KnockOut` now also contain a `numPlayers` instance variable for consistency

0.10.2 / 2012-12-22
===================
  * `FFA` now able to create single match tournaments internally (for tiebreaking)
  * `FFA` positioning only really worked for the one special case we tested for with `limit` set - now fixed (and more tests)

0.10.1 / 2012-12-20
===================
  * `GroupStage` results fixed up `pos` positioning was inconsistent and wrong, now robust
  * `GroupStage` results now allow an options object to set the amount of points to be rewarded for winning/tieing and whether or not maps should break positions.
  * `GroupStage` results expose `grp` as the group number the player was/is in
  * Note: `GroupStage` can still not be used multistage with `limit` options yet, see issue #7

0.10.0 / 2012-12-15
===================
  * added alternate entry points for people who just want one tournament type
    can be used with `require('tournament/duel')` or `/knockout` or `/ffa` or `/groupstage`
  * `groups` and `robin` factored into own helper file
  * fixed a bug in `KnockOut` restrictions in `KnockOut.invalid` which allowed a 1 player final

0.9.0 / 2012-12-10
==================
  * `.invalidReason` -> `.invalid`
  * `.scorable` refactored into `.unscorable` which returns a reason string if !scorable
  * Remove `trueRoundOrder` scorable feature

0.8.0 / 2012-12-09
==================
  * `FFA.invalidReason` now takes the same parameters as `FFA` constructor
  * All other tournament types have a static `.invalidReason` function that takes the same parameter as their respective constructors
  * `Duel::roundName` now takes a partial or complete id from a round in a tournament instead of both round and bracket - also works with Double elimination
  * `duel_names.js` contains this code and is's a basic english shell that can be copied into an own module and used similarly as a replacement mixin for full localization
  * Fixed a bug where `Duel::isDone()` returned true prematurely.

0.7.0 / 2012-12-08
==================
  * `FFA` tournaments now a better set of restrictions imposed to ensure things are valid.
  * Internal `FFA` restriction function exported to `t.FFA.invalidReason` and returns a reason (for client) or `null` if valid configuration.
  * `FFA` tournaments does not position (the `.pos` attribute in each `results()` element) between groups anymore - all x-placers are tied (but we still sort the list by pos then sum of scores)
  * `FFA` tournaments allow an experimental `limit` parameter to the last options parameter (first tournament type that implements this) so that you can guarantee you can pick the top `limit` at the end of a tournament (via `results()`) and send those to another tournament (multi-stage tournaments)

0.6.0 / 2012-11-29
==================
  * `FFA` tournaments now require full control of input parameters - no more guessing of what the user wants, let the users control it all - and let the guess work be handled externally.
  * `FFA` tournaments take array of group sizes and array of advancers to be input at construction.
  * All tournament types had an instance method `::representation` which is now a static `.idString` function instead - this is exportable as always independent of tournament settings
  * `Duel::roundName` somewhat improved, but still a bit lackluster - ideas welcome

0.5.0 / 2012-11-22
==================
  * `Duel` constructor heaps optional flags in the third options object. This used to be a bool only for the current only option [only minor bump reason]
  * `Duel` double elimination positions are now accurate mid tournament
  * `Duel` scoring now only affects the winner (other players are scored as if they're about to lose everything to give a guaranteed score at any point)

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
