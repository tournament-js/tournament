var $ = require('interlude');

var o = { NONE: 0 }; // no player marker same for all tournaments

// since we are factoring out match stuff - maybe we can make id.s / id.r / id.m optional?
// we do we require it? for simple findMatch?
o.findMatch = function (ms, id) {
  return $.firstBy(function (m) {
    return (id.s === m.id.s) &&
           (id.r === m.id.r) &&
           (id.m === m.id.m) &&
           (m.id.t == null || m.id.t === id.t);
  }, ms);
};

o.findMatches = function (ms, id) {
  return ms.filter(function (m) {
    return (id.t == null || m.id.t === id.t) &&
           (id.s == null || m.id.s === id.s) &&
           (id.r == null || m.id.r === id.r) &&
           (id.m == null || m.id.m === id.m);
  });
};

o.findMatchesRanged = function (ms, lb, ub) {
  ub = ub || {};
  return ms.filter(function (m) {
    // TODO: care about id.t?
    return (lb.s == null || m.id.s >= lb.s) &&
           (lb.r == null || m.id.r >= lb.r) &&
           (lb.m == null || m.id.m >= lb.m) &&
           (ub.s == null || m.id.s <= ub.s) &&
           (ub.r == null || m.id.r <= ub.r) &&
           (ub.m == null || m.id.m <= ub.m);
  });
};

// TODO: before we move this here - see if it is useful for tourney
// maybe partition by stages?
o.partitionMatches = function (ms, splitKey, filterKey, filterVal) {
  var res = [];
  for (var i = 0; i < ms.length; i += 1) {
    var m = ms[i];
    if (filterVal == null || m.id[filterKey] === filterVal) {
      if (!Array.isArray(res[m.id[splitKey] - 1])) {
        res[m.id[splitKey] - 1] = [];
      }
      res[m.id[splitKey] - 1].push(m);
    }
  }
  return res;
};

o.matchesForPlayer = function (ms, playerId) {
  return ms.filter(function (m) {
    return m.p.indexOf(playerId) >= 0;
  });
};

o.players = function (ms) {
  var ps = ms.reduce(function (acc, m) {
    return acc.concat(m.p); // collect all players in given matches
  }, []);
  return $.nub(ps).filter($.gt(o.NONE)).sort($.compare());
};

o.upcoming = function (ms, playerId) {
  return $.firstBy(function (m) {
    return m.p.indexOf(playerId) >= 0 && !m.m;
  }, ms);
};

o.started = function (ms) {
  return ms.some(function (m) {
    return m.p.every($.gt(o.NONE)) && m.m; // not an automatically scored match
  });
};

o.playable = function (m) {
  return !m.p.some($.eq(o.NONE));
};

module.exports = o;
