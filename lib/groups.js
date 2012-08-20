var $ = require('interlude')
  , g = {};

g.groups = function (numPlayers, groupSize) {
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
g.robin = function (n, ps) {  // n = num players
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
  var gs = T.groups(numPlayers, groupgroupSize);

  var games = [];
  for (var i = 0; i < gs.length; i += 1) {
    var group = gs[i];
    // make robin rounds for the group
    var rnds = T.robin(group.length, group);
    // TODO: will need common when we make games
    games.push(rnds);
  }
  return games;
};

var score = function (games, id, mapScore) {

};

// abstraction
function GroupStage(numPlayers, groupSize, games) {
  this.games = games || groupStage(numPlayers, groupSize);
}

GroupStage.prototype.score = function (id, mapScore) {
  return false;
};

GroupStage.prototype.scorable = function (id) {
  return true; // impossible to be to early really, unless want to do rounds one by one
};

GroupStage.fromGames = function (games) {
  var groupSize = $.maximum(games.map($.get('p.length')));
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new GroupStage(numPlayers, groupSize, games));
};

g.GroupStage = GroupStage;

module.exports = g;
