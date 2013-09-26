var T = {
  WO : -1,  // bye/walk-over marker (duel/balancer)
  NA : 0,   // player not ready marker (ffa/duel/knockout)
  // brackets: duel only (for now.. crossovers could change that)
  // Bracket numbers are locked down for the the following logical equivalence:
  // numBrackets === n <=> lastBracket === n <=> n-tuple elimination
  WB : 1,
  LB : 2,
  TB : 3
};

module.exports = T;
