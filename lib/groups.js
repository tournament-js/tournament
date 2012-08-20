var $ = require('interlude')
  , t = require('typr')
  , T = require('./common')
  , g = {};

var groups = function (numPlayers, groupSize) {
  if (!numPlayers || !groupSize) {
    return [];
  }
  var numGroups = Math.ceil(numPlayers / groupSize);
  // need the internal groupSize model used to be correct
  while (numGroups * groupSize - numPlayers >= numGroups) {
    groupSize -= 1;
  }

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

// returns an array of round representation arrays. Each containing all games to be played in one round, filling in seeding numbers as player placeholders
// each match array (the innermost one) if of the form [player1, player2]
// follows http://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
var robin = function (n, ps) {  // n = num players
  var rs = [];                // rs = round array
  if (!ps) {
    ps = $.range(n);          // player array
  }

  if (n % 2 === 1) {
    ps.push(-1); // add dummy player to match algorithm for even numbers
    n += 1;
  }
  for (var j = 0; j < n - 1; j += 1) {
    rs[j] = []; // create inner match array for round j
    for (var i = 0; i < n / 2; i += 1) {
      if (ps[i] !== -1 && ps[n - 1 - i] !== -1) { // both players are non-dummies
        rs[j].push([ps[i], ps[n - 1 - i]]); // insert the pair as a game
      }
    }
    ps.splice(1, 0, ps.pop()); // permutate for next round
  }
  return rs;
};

var groupStage = function (numPlayers, groupSize) {
  var gs = groups(numPlayers, groupSize);

  var games = [];
  for (var i = 0; i < gs.length; i += 1) {
    var group = gs[i];
    // make robin rounds for the group
    var rnds = robin(group.length, group);
    for (var r = 0; r < rnds.length; r += 1) {
      var rnd = rnds[r];
      for (var g = 0; g < rnd.length; g += 1) {
        var pls = rnd[g];
        games.push({id: {b: i + 1, r: r + 1, g: g + 1}, p : pls}); // bracket as group
      }
    }
  }
  return games;
};

var score = function (gs, id, score) {
  // 0. sanity check
  var m = $.firstBy(T.byId.bind(null, id), gs);
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

  // 1. score given game
  m.m = score; // only map scores are relevant for progression

  // results calculated on demand, no progression needed
  return true;
};

var results = function (gs, np, grpSize) {
  var res = [];
  for (var s = 0; s < np; s += 1) {
    res[s] = {
      seed : s + 1
    , maps : 0
    , pts  : 0 // robin rounds require points to determine position
    , pos  : grpSize
    };
  }

  for (var i = 0; i < gs.length; i += 1) {
    var g = gs[i];
    if (!g.m) {
      continue; // only count played games
    }

    var p0 = g.p[0] - 1
      , p1 = g.p[1] - 1;

    if (g.m[0] === g.m[1]) {
      res[p0].pts += 1;
      res[p1].pts += 1;
    }
    else {
      var w = (g.m[0] > g.m[1]) ? p0 : p1;
      res[w].wins += 1;
      res[w].pts += 3;
    }

    res[p0].maps += g.m[0];
    res[p1].maps += g.m[1];
  }

  // TODO: need to sort across groups, maybe resuse b: as group number

  return res;
};

// abstraction
function GroupStage(numPlayers, groupSize, games) {
  this.numPlayers = numPlayers;
  this.groupSize = groupSize;
  this.games = games || groupStage(numPlayers, groupSize);
}

GroupStage.prototype.score = function (id, mapScore) {
  return score(this.games, id, mapScore);
};

GroupStage.prototype.scorable = function (id) {
  return true; // impossible to be to early really, unless want to do rounds one by one
};

GroupStage.prototype.results = function () {
  return results(this.games, this.numPlayers, this.groupSize);
};

GroupStage.fromGames = function (games) {
  var groupSize = $.maximum(games.map($.get('p.length')));
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new GroupStage(numPlayers, groupSize, games));
};

module.exports = {
  GroupStage : GroupStage
, groups     : groups
, robin      : robin
};
