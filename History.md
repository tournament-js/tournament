PLANNED FOR 0.3.0
==================
  * add opitonal gf2 flag to duel double elimination (by default on, like bronze final in single)
  * crossover bracket for ffa elimination [will be difficult]

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
