var eql = require('deep-equal');

var T = {
  WB : 1,
  LB : 2,
  WO : -1,
  NA : 0
};

// only need to check if a match has the given id, not complete equality
T.byId = function (id, g) {
  return eql(id, g.id);
};

// sorting is done in the order you'd read it: section -> round -> match number.
T.compareMatches = function (g1, g2) {
  return (g1.id.s - g2.id.s) || (g1.id.r - g2.id.r) || (g1.id.m - g2.id.m);
};

// compute ties by updating the passed in res array of objects
// used by tournament types that have more than 2 player per match
T.positionTies = function (res, sortedPairSlice, startPos) {
  var currentTies = 0;
  // when we only score a subset start positioning at the beginning of slice
  var currentPos = startPos;
  var currentScore = -Infinity;

  // loop over players in order of their score
  for (var k = 0; k < sortedPairSlice.length; k += 1) {
    var pair = sortedPairSlice[k];
    var p = pair[0] - 1;
    var s = pair[1];

    // if this is a tie, pos is previous one, but keep track of num ties per pos
    if (Number.isFinite(currentScore) && Math.max(currentScore, s) === s) {
      currentTies += 1;
      res[p].pos = currentPos;
    }
    else {
      currentPos += 1;
      // move over tie count from earlier iterations
      currentPos += currentTies;
      currentTies = 0;
      res[p].pos = currentPos;
    }
    currentScore = s;

    // grand final winner have to be computed outside normal progression check
    // so do it in here if we just moved the guy to position 1
    // this function is only called once on each set - and tested heavily anyway
    if (res[p].pos === 1) {
      res[p].wins += 1;
    }
  }
};

module.exports = T;

