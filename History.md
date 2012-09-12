NEXT / 2012-XX-XX
==================
  * verify complete `upcoming()` behaviour for all types
  * add opitonal gf2 flag to duel double elimination
  * verify scorability, particularly important to have good tests for an optional gf2

0.2.2 / 2012-09-XX
==================
  * scorable/upcoming methods now takes care of corner cases for good consistency (readme updated)

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
