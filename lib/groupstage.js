var $ = require('interlude')
  , algs = require('./balancer')
  , Base = require('./base');

var idString = function (id) {
  return "G" + id.s + " R" + id.r + " M" + id.m;
};

var invalid = function (np, gs) {
  if (!Number.isFinite(np) || Math.ceil(np) !== np ||
      !Number.isFinite(gs) || Math.ceil(gs) !== gs) {
    return "numPlayers and groupSize must be finite integers";
  }
  if (np < 3) {
    return "GroupStage needs at least 3 players";
  }
  if (gs < 3) {
    return "GroupStage needs a group size greater than or equal 3";
  }
  if (gs > np) {
    return "cannot create GroupStage with groupSize > numPlayers";
  }
  return null;
};

var groupStage = function (numPlayers, groupSize) {
  var invReason = invalid(numPlayers, groupSize);
  if (invReason !== null) {
    console.error("invalid GroupStage configuration: %dp in groups of %d"
      , numPlayers, groupSize);
    console.error("reason: ", invReason);
    return [];
  }
  var ms = algs.groups(numPlayers, groupSize);

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
  return matches.sort(Base.compareMatches);
};

// abstraction
function GroupStage(numPlayers, groupSize) {
  if (!(this instanceof GroupStage)) {
    return new GroupStage(numPlayers, groupSize);
  }
  Base.call(this, GroupStage, groupStage(numPlayers, groupSize));
  this.version = 1;
  this.numPlayers = numPlayers;
  this.numGroups = $.maximum(this.matches.map($.get('id', 's')));
  this.groupSize = Math.ceil(numPlayers / this.numGroups);
}
GroupStage.prototype = Object.create(Base.prototype);
GroupStage.parse = Base.parse.bind(null, GroupStage);
GroupStage.idString = idString;
GroupStage.invalid = invalid;

// NB: score and unscorable defers entirely to Base

// helper
GroupStage.prototype.groupFor = function (playerId) {
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (m.p.indexOf(playerId) >= 0) {
      return m.id.s;
    }
  }
};

var defaultResOpts = {
  winPoints : 3,
  tiePoints : 1,
  mapsBreak : false
};

GroupStage.prototype.results = function (opts) {
  var cfg = $.extend(Object.create(defaultResOpts), opts || {});
  var np = this.numPlayers;

  // init results array
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
      grp   : this.groupFor(s+1),
      gpos  : this.groupSize
    };
  }

  var isDone = true;
  for (var i = 0; i < this.matches.length; i += 1) {
    var m = this.matches[i];
    if (!m.m) {
      isDone = false; // only lower `pos` when all matches played
      continue; // only count played matches
    }
    var p0 = m.p[0] - 1
      , p1 = m.p[1] - 1;

    if (m.m[0] === m.m[1]) {
      res[p0].pts += cfg.tiePoints;
      res[p1].pts += cfg.tiePoints;
      res[p0].draws += 1;
      res[p1].draws += 1;
    }
    else {
      var w = (m.m[0] > m.m[1]) ? p0 : p1;
      var l = (m.m[0] > m.m[1]) ? p1 : p0;
      res[w].wins += 1;
      res[w].pts += cfg.winPoints;
      res[l].losses += 1;
    }

    res[p0].maps += m.m[0];
    res[p1].maps += m.m[1];
  }
  var compareResults = $.comparing('pts', -1, 'maps', -1);
  res.sort(compareResults); // good start

  // create a list of res objects inside each group (sorted as res is)
  var grps = $.replicate(this.numGroups, []);
  for (var k = 0; k < res.length; k += 1) {
    var p = res[k];
    grps[p.grp - 1].push(p);
  }

  // find internal gpos attr for groups (each g sorted by compareResults as res is)
  // also build up arrays of xplacers
  var xarys = $.replicate(this.groupSize, []);
  grps.forEach(function (g) {
    algs.tieCompute(g, 0, cfg.mapsBreak, function (r, pos) {
      r.gpos = pos;
      xarys[pos-1].push(r); // so we can nicely loop over xplacers later
    });
  });
  // sort each xplacer array additionally for seed number
  // they are ultimately tied between groups anyway at this stage
  xarys.forEach(function (xs) {
    xs.sort($.comparing('seed', +1));
  });

  // gradually build up and position res by one x-placers step at a time
  // NB: result is sorted as each xarys is pushed in the same order as their g
  var srtd = [];
  xarys.reduce(function (currPos, xplacers) {
    xplacers.sort(compareResults);
    algs.tieCompute(xplacers, currPos, cfg.mapsBreak, function (r, pos) {
      r.pos = isDone ? pos : np; // only position after done (lest pos decreases)
      srtd.push(r);
    });
    return currPos + xplacers.length; // always break up xplacers and (x+1)placers
  }, 0);
  return srtd;
};

module.exports = GroupStage;
