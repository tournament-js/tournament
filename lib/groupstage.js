var log = require('logule').init(module)
  , $ = require('interlude')
  , algs = require('./balancer')
  , T = require('./common');

var idString = function (id) {
  return "G" + id.s + "R" + id.r + " M" + id.m;
};

var invalid = function (np, gs) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np ||
      !Number.isFinite(gs) || Math.ceil(gs) !== gs) {
    return "numPlayers and groupSize must be finite integers";
  }
  if (np < 4) {
    return "GroupStage needs at least 4 players";
  }
  if (gs <= 2) {
    return "GroupStage needs a group size greater than 2";
  }
  if (gs > np) {
    return "cannot create GroupStage with groupSize > numPlayers";
  }
  return null;
};

var groupStage = function (numPlayers, groupSize) {
  var invReason = invalid(numPlayers, groupSize);
  if (invReason !== null) {
    log.error("invalid GroupStage configuration: %dp in groups of %d"
      , numPlayers, groupSize);
    log.error("reason: ", invReason);
    return [];
  }
  var ms = algs.groups(numPlayers, groupSize);
  log.trace('creating', numPlayers + 'p group stage with group size', groupSize);

  var matches = [];
  for (var g = 0; g < ms.length; g += 1) {
    var group = ms[g];
    // make robin rounds for the group
    var rnds = algs.robin(group.length, group);
    for (var r = 0; r < rnds.length; r += 1) {
      var rnd = rnds[r];
      for (var m = 0; m < rnd.length; m += 1) {
        var pls = rnd[m];
        matches.push({id: {s: g + 1, r: r + 1, m: m + 1}, p : pls});
      }
    }
  }
  return matches.sort(T.compareMatches);
};

var unscorable = function (ms, id, score, allowPast) {
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (!m) {
    return idString(id) + " not found in group stage";
  }
  if (!Array.isArray(score) || score.length !== 2)  {
    return "player scores must be an array of length 2";
  }
  if (!score.every(Number.isFinite)) {
    return "player scores must all be numeric";
  }
  if (!allowPast && Array.isArray(m.m)) {
    return "cannot re-score matches";
  }
  return null;
};

var score = function (ms, id, score) {
  // 0. error handling - if this fails client didnt guard so we log
  var invReason = unscorable(ms, id, score, true);
  if (invReason !== null) {
    log.error("failed scoring group stage match %s with %j", idString(id), score);
    log.error("reason:", invReason);
    return false;
  }
  log.trace("scoring GroupStage %s with %j", idString(id), score);

  // 1. score given match
  var m = $.firstBy(T.byId.bind(null, id), ms);
  m.m = score; // only map scores are relevant for progression

  return true;
};

var results = function (ms, np, grpSize) {
  var res = [];
  for (var s = 0; s < np; s += 1) {
    res[s] = {
      seed : s + 1,
      maps : 0,
      pts  : 0, // robin rounds require points to determine position
      pos  : grpSize,
      wins : 0,
      grp  : T.NA // temporary property to allow sorting within groups
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
  res.sort(compareResults); // good start

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


  var final = []
    , maxGrpLen = $.maximum($.pluck('length', grps));
  for (var x = 0; x < maxGrpLen; x += 1) {
    var xPlacers = []; // sort the xPlacers between groups by compareResults
    for (var j = 0; j < grps.length; j += 1) {
      var pxj = grps[j][x]; // get the (x+1)-placer in group j
      delete pxj.grp;
      if (pxj) {
        $.insertBy(compareResults, xPlacers, pxj); // ensures correct insertion order
      }
    }
    final = final.concat(xPlacers);
  }

  return final;
};

var upcoming = function (ms, pId) {
  // find first unplayed, pick by round asc [matches are sorted, can pick first]
  var match = $.firstBy(function (m) {
    return m.p.indexOf(pId) >= 0 && !m.m;
  }, ms);
  if (match) {
    return match.id;
  }
};


// abstraction
function GroupStage(numPlayers, groupSize, matches) {
  this.numPlayers = numPlayers; // always passed in
  if (matches) {
    this.matches = matches;
  }
  else {
    this.matches = groupStage(numPlayers, groupSize);
  }

  var numGroups = $.maximum(this.matches.map($.get('id', 's')));
  // since numGroups have been reduced sufficiently here, we can just divide!
  this.groupSize = Math.ceil(numPlayers / numGroups);
}

GroupStage.invalid = invalid;
GroupStage.idString = idString;

GroupStage.prototype.score = function (id, mapScore) {
  return score(this.matches, id, mapScore);
};

GroupStage.prototype.unscorable = function (id, mapScore, past) {
  return unscorable(this.matches, id, mapScore, past);
};

GroupStage.prototype.results = function () {
  return results(this.matches, this.numPlayers, this.groupSize);
};

GroupStage.prototype.isDone = function () {
  return this.matches.every(function (m) {
    return Array.isArray(m.m);
  });
};

GroupStage.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, playerId);
};

GroupStage.fromJSON = function (matches) {
  if (!matches.length) {
    log.error("cannot recreate tournament - no matches found");
    return;
  }
  var numPlayers = $.maximum($.flatten($.pluck('p', matches)));
  return (new GroupStage(numPlayers, 0, matches));
};

module.exports = GroupStage;
