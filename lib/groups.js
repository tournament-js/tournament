var $ = require('interlude')
  , t = require('typr')
  , T = require('./common')
  , g = {};


var representation = function (id) {
  return "G" + id.s + "R" + id.r + " M" + id.m;
};

var reduceGroupSize = function (numPlayers, groupSize, numGroups) {
  // hwile all groups have 1 free slot
  while (numGroups * groupSize - numPlayers >= numGroups) {
    groupSize -= 1;
  };
  return groupSize
};

var groups = function (numPlayers, groupSize) {
  if (!numPlayers || !groupSize) {
    return [];
  }
  var numGroups = Math.ceil(numPlayers / groupSize);
  groupSize = reduceGroupSize(numPlayers, groupSize, numGroups);


  var model = numGroups * groupSize
    , groupList = [];

  for (var i = 0; i < numGroups; i += 1) {
    groupList.push([]);
  }

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

// returns an array of round representation arrays.
// Each containing all matches to be played in one round, filling in seeding numbers or ps as placeholders
// each match array (the innermost one) if of the form [player1, player2]
// follows http://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
var robin = function (n, ps) {  // n = num players
  var rs = [];                  // rs = round array
  if (!ps) {
    ps = $.range(n);            // player array
  }

  if (n % 2 === 1) {
    ps.push(-1); // add dummy player to match algorithm for even numbers
    n += 1;
  }
  for (var j = 0; j < n - 1; j += 1) {
    rs[j] = []; // create inner match array for round j
    for (var i = 0; i < n / 2; i += 1) {
      if (ps[i] !== -1 && ps[n - 1 - i] !== -1) { // both players are non-dummies
        rs[j].push([ps[i], ps[n - 1 - i]]); // insert the pair as a match
      }
    }
    ps.splice(1, 0, ps.pop()); // permutate for next round
  }
  return rs;
};

var groupStage = function (numPlayers, groupSize) {
  var ms = groups(numPlayers, groupSize);

  var matches = [];
  for (var i = 0; i < ms.length; i += 1) {
    var group = ms[i];
    // make robin rounds for the group
    var rnds = robin(group.length, group);
    for (var r = 0; r < rnds.length; r += 1) {
      var rnd = rnds[r];
      for (var g = 0; g < rnd.length; g += 1) {
        var pls = rnd[g];
        matches.push({id: {s: i + 1, r: r + 1, m: g + 1}, p : pls}); // bracket as group
      }
    }
  }
  return matches.sort(T.compareMatches);
};

var score = function (ms, id, score) {
  // 0. sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (!m) {
    console.error(T.representation(id) + " match not found in tournament");
    return false;
  }
  if (!Array.isArray(score) || score.length !== 2)  {
    console.error("invalid scores: must be array of length 2 - got: " + JSON.stringify(score));
    return false;
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric)) {
    console.error("invalid player scores: both must be numeric - got: " + JSON.stringify(score));
    return false;
  }

  // 1. score given match
  m.m = score; // only map scores are relevant for progression

  // results calculated on demand, no progression needed
  return true;
};

var results = function (ms, np, grpSize) {
  var res = [];
  for (var s = 0; s < np; s += 1) {
    res[s] = {
      seed : s + 1
    , maps : 0
    , pts  : 0 // robin rounds require points to determine position
    , pos  : grpSize
    , grp  : T.NA // temporary property to allow sorting within groups
    };
  }

  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (!m.m) {
      continue; // only count played matches
    }

    var p0 = m.p[0] - 1
      , p1 = m.p[1] - 1;

    if (m.m[0] === m.m[1]) {
      res[p0].pts += 1;
      res[p1].pts += 1;
    }
    else {
      var w = (m.m[0] > m.m[1]) ? p0 : p1;
      res[w].wins += 1;
      res[w].pts += 3;
    }

    res[p0].grp = m.id.s;
    res[p1].grp = m.id.s;
    res[p0].maps += m.m[0];
    res[p1].maps += m.m[1];
  }

  var compareResults = $.comparing('pts', -1, 'maps', -1);
  res = res.sort(compareResults); // good start

  // need to sort the x-placers across groups for all x in 1..group.length
  var grps = [];
  for (var k = 0; k < res.length; k += 1) {
    var p = res[k]
      , grp = p.grp - 1;
    if (!grps[grp]) {
      grps[grp] = [];
    }
    grps[grp].push(p); //  res sorted => grps[grp] sorted
  }
  //return grps;

  var final = []
    , maxGrpLen = $.maximum($.pluck('length', grps));
  for (var x = 0; x < maxGrpLen; x += 1) {
    var xPlacers = []; // sort the xPlacers between groups by compareResults
    for (var j = 0; j < grps.length; j += 1) {
      var pxj = grps[j][x]; // get the (x+1)-placer in group j
      if (pxj) {
        $.insert(compareResults, xPlacers, pxj); // ensures correct insertion order
      }
    }
    final = final.concat(xPlacers);
  }

  return final;
};

var upcoming = function (ms, pId) {
  var relevants = ms.filter(function (m) {
    return m.p.indexOf(pId) >= 0;
  });

  if (!relevants) {
    return null; // player not in tournament
  }
  // find first unplayed, pick by round asc
  var unPlayed = relevants.filter(function (m) {
    return !m.m;
  });

  if (!unPlayed) {
    return null;
  }

  return $.minimumBy(function (x, y) {
    return x.id.r - y.id.r;
  }, unPlayed).id;
};

var scorable = function (ms, id, trueRoundOrder) {
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (!m) {
    return false;
  }
  else if (!trueRoundOrder) {
    return true; // matches can be scored in any other within-groups
  }

  // return: no matches in this group with lower round number, whose match is unscored
  return !ms.filter(function (m) {
    return m.id.s === id.s && m.id.r < id.r && !m.m;
  }).length;
};

// abstraction
function GroupStage(numPlayers, groupSize, matches) {
  this.numPlayers = numPlayers;
  this.groupSize = groupSize;
  this.matches = matches || groupStage(numPlayers, groupSize);
}

GroupStage.prototype.score = function (id, mapScore) {
  return score(this.matches, id, mapScore);
};

GroupStage.prototype.scorable = function (id, trueRoundOrder) {
  return scorable(this.matches, id, trueRoundOrder);
};

GroupStage.prototype.results = function () {
  return results(this.matches, this.numPlayers, this.groupSize);
};

GroupStage.prototype.representation = representation;

GroupStage.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, playerId);
};

GroupStage.fromJSON = function (matches) {
  var groupSize = $.maximum(matches.map($.get('p.length')));
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new GroupStage(numPlayers, groupSize, matches));
};

module.exports = {
  GroupStage : GroupStage
, groups     : groups
, robin      : robin
, reduceGroupSize : reduceGroupSize // for ffa calculations
};
