var log = require('logule').init(module)
  , $ = require('interlude')
  , algs = require('./balancer')
  , T = require('./common');

var idString = function (id) {
  return "G" + id.s + " R" + id.r + " M" + id.m;
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
  var m = T.findMatch(ms, id);
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
  var m = T.findMatch(ms, id);
  m.m = score; // only map scores are relevant for progression

  return true;
};

var results = function (ms, np, grpSize, numGroups, opts) {
  var mapsBreak = opts.mapsBreak
    , winPts = opts.winPoints
    , tiePts = opts.tiePoints;

  var res = [];
  for (var s = 0; s < np; s += 1) {
    res[s] = {
      seed  : s + 1,
      maps  : 0,
      pts   : 0, // robin rounds require points to determine position
      pos   : np, // cannot estimate position before a group is fully played
      wins  : 0,
      draws : 0,
      losses: 0,
      gpos  : grpSize
    };
    // also find group number that the player is in (first id.s where seed is in .p)
    for (var j = 0; j < ms.length; j += 1) {
      if (ms[j].p.indexOf(s+1) >= 0) {
        res[s].grp = ms[j].id.s;
        break;
      }
    }
  }

  var isDone = true;
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (!m.m) {
      isDone = false; // only lower `pos` when all matches played
      continue; // only count played matches
    }
    var p0 = m.p[0] - 1
      , p1 = m.p[1] - 1;

    if (m.m[0] === m.m[1]) {
      res[p0].pts += tiePts;
      res[p1].pts += tiePts;
      res[p0].draws += 1;
      res[p1].draws += 1;
    }
    else {
      var w = (m.m[0] > m.m[1]) ? p0 : p1;
      var l = (m.m[0] > m.m[1]) ? p1 : p0;
      res[w].wins += 1;
      res[w].pts += winPts;
      res[l].losses += 1;
    }

    res[p0].maps += m.m[0];
    res[p1].maps += m.m[1];
  }

  var compareResults = $.comparing('pts', -1, 'maps', -1);
  res.sort(compareResults); // good start

  // create a list of res objects inside each group (sorted as res is)
  var grps = $.replicate(numGroups, []);
  for (var k = 0; k < res.length; k += 1) {
    var p = res[k];
    grps[p.grp - 1].push(p);
  }

  var tieCompute = function (ary, startPos, cb) {
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
      cb(r, pos); // so we can do something with pos on r
    }
  };
  // find internal gpos attr for groups (each g sorted by compareResults as res is)
  // also build up arrays of xplacers
  var xarys = $.replicate(grpSize, []);
  grps.forEach(function (g) {
    tieCompute(g, 0, function (r, pos) {
      r.gpos = pos;
      xarys[pos-1].push(r); // so we can nicely loop over xplacers later
    });
  });

  // gradually build up and position res by one x-placers step at a time
  // NB: result is sorted as each xarys is pushed in the same order as their g
  var srtd = [];
  var startPos = 0;
  xarys.forEach(function (xplacers) {
    xplacers.sort(compareResults);
    tieCompute(xplacers, startPos, function (r, pos) {
      r.pos = isDone ? pos : np; // only position after done (lest pos decreases)
      srtd.push(r);
    });
    startPos += xplacers.length; // always break up xplacers and (x+1)placers
  });
  return srtd;
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
  this.matches = matches || groupStage(numPlayers, groupSize);

  this.numGroups = $.maximum(this.matches.map($.get('id', 's')));
  this.groupSize = Math.ceil(numPlayers / this.numGroups);
}

GroupStage.fromJSON = function (matches) {
  if (!matches.length) {
    log.error("cannot recreate tournament - no matches found");
    return;
  }
  var numPlayers = $.maximum($.flatten($.pluck('p', matches)));
  return (new GroupStage(numPlayers, 0, matches));
};
GroupStage.invalid = invalid;
GroupStage.idString = idString;

GroupStage.prototype.score = function (id, mapScore) {
  return score(this.matches, id, mapScore);
};

GroupStage.prototype.unscorable = function (id, mapScore, past) {
  return unscorable(this.matches, id, mapScore, past);
};

var defaultResOpts = {
  winPoints : 3,
  tiePoints : 1,
  mapsBreak : false
};
GroupStage.prototype.results = function (opts) {
  var def = $.extend({}, defaultResOpts);
  return results(
    this.matches,
    this.numPlayers,
    this.groupSize,
    this.numGroups,
    $.extend(def, opts || {})
  );
};

GroupStage.prototype.isDone = function () {
  return this.matches.every($.get('m'));
};

GroupStage.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, playerId);
};

module.exports = GroupStage;
