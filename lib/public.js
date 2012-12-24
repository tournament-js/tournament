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

// matches are stored in a sorted array rather than an ID -> Match map
// This is because ordering is more important than being able to access any match
// at any time. Looping to find the one is also quick because ms is generally short.
T.findMatch = function (ms, id) {
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (m.id.s === id.s && m.id.r === id.r && m.id.m === id.m) {
      return m;
    }
  }
};

module.exports = T;
