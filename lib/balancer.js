var $ = require('interlude');
const DUMMY = -1;

// FFA needs this too
exports.reduceGroupSize = function (numPlayers, groupSize, numGroups) {
  // while all groups have 1 free slot
  while (numGroups * groupSize - numPlayers >= numGroups) {
    groupSize -= 1;
  }
  return groupSize;
};

exports.groups = function (numPlayers, groupSize) {
  var numGroups = Math.ceil(numPlayers / groupSize);
  groupSize = exports.reduceGroupSize(numPlayers, groupSize, numGroups);

  var model = numGroups * groupSize
    , groupList = $.replicate(numGroups, []);

  // iterations required to fill groups
  for (var j = 0; j < Math.ceil(groupSize / 2); j += 1) {
    // fill each group with pairs that sum to model + 1
    // until you are in the last iteration (in which may only want one of them)
    for (var g = 0; g < numGroups; g += 1) {
      var a = j*numGroups + g + 1;

      groupList[g].push(a);
      if (groupList[g].length < groupSize) {
        groupList[g].push(model + 1 - a);
      }
    }
  }

  // remove non-present players and sort by seeding number
  return groupList.map(function (g) {
    return g.sort($.compare()).filter(function (p) {
      return p <= numPlayers;
    });
  });
};

// returns an array of round representations (array of player pairs).
// http://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
exports.robin = function (n, ps) {  // n = num players
  var rs = [];                  // rs = round array
  if (!ps) {
    ps = $.range(n);            // player array
  }

  if (n % 2 === 1) {
    ps.push(DUMMY); // so we can match algorithm for even numbers
    n += 1;
  }
  for (var j = 0; j < n - 1; j += 1) {
    rs[j] = []; // create inner match array for round j
    for (var i = 0; i < n / 2; i += 1) {
      if (ps[i] !== DUMMY && ps[n - 1 - i] !== DUMMY) {
        rs[j].push([ps[i], ps[n - 1 - i]]); // insert pair as a match
      }
    }
    ps.splice(1, 0, ps.pop()); // permutate for next round
  }
  return rs;
};

// helper that takes a result array slice that contains pts and maps
// and calls back with the new position relative to startPos and ary slice
// that it would have gotten from this computation
exports.tieCompute = function (ary, startPos, mapsBreak, cb) {
  var pos = startPos
    , ties = 0
    , pts = -Infinity
    , maps = -Infinity;
  for (var i = 0; i < ary.length; i += 1) {
    var r = ary[i]
      , samePts = (r.pts === pts)
      , sameScores = (r.maps === maps);

    if (samePts && (!mapsBreak || sameScores)) {
      ties += 1;
    }
    else {
      pos += 1 + ties;
      ties = 0;
    }
    pts = r.pts;
    maps = r.maps;
    cb(r, pos, i); // so we can do something with pos on r
  }
};
