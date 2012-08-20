var T = require('./common')
  , t = require('typr')
  , $ = require('interlude');

// Make easy access constants available  directly
var WB = T.WB
  , LB = T.LB
  , NA = T.NA
  , WO = T.WO;

// mark players that had to be added to fit model as WO's
var woMark = function (ps, numPlayers) {
  return ps.map(function (p) {
    return (p > numPlayers) ? WO : p;
  });
};

// shortcut to create a game id as this module can be very specific and create a lot
var gId = function (b, r, g) {
  return {b: b, r: r, g: g};
};

// -----------------------------------------------------------------------------
// duel elimination stuff

// helpers to initialize duel tournaments
var even_seed = function (i, n) {
  var k = Math.floor(Math.log(i) / Math.log(2))
    , r = i - Math.pow(2, k);
  if (r === 0) {
    return Math.pow(2, n - k);
  }
  var nr = (i - 2*r).toString(2).split('').reverse().join('');
  return (parseInt(nr, 2) << n - nr.length) + Math.pow(2, n - k - 1);
};

// returns the seeds in match i when the match is played in a tournament of size 2**pow
// NB: match_nr is 1-indexed [passing i=0 -> massive negative number]
var seeds = function (i, pow, numPlayers) {
  var even = even_seed(i, pow);
  return [Math.pow(2, pow) + 1 - even, even];
};

// return an array of games for a tournament
// a match has the form {p: playerArray, b: bracketNum, r: roundNum, g: gameNum}
// bracket, round and game number are 1 indexed
var elimination = function (numPlayers, last) {
  if (numPlayers < 4) {
    return [];
  }
  if ([1, 2].indexOf(last) < 0) {
    return []; // triple elimination or other variants not implemented
  }

  var n = Math.ceil(Math.log(numPlayers) / Math.log(2))
    , num = Math.pow(2, n)    // true model number
    , games = [];           // match array

  // create round 1,2 in WB & LB
  (function init() {
    // placeholders for progression games in WBR2, LBR1 & LBR2 used in even iterations,
    var lbm1, lbm2, wbm2;

    for (var i = 1; i <= num / 2; i += 1) {
      var ps = woMark(seeds(i, n), numPlayers)
        , isEven = Number(i % 2 === 0)
        , wbm1 = {id: gId(WB, 1, i), p: ps}; // this gets one per iteration

      // create shells for WBR2, LBR1 & LBR2
      if (!isEven) {
        var next = (i+1) / 2;
        wbm2 = {id: gId(WB, 2, next), p: [NA, NA]};

        if (last >= LB) {
          lbm1 = {id: gId(LB, 1, next), p: [NA, NA]};
          lbm2 = {id: gId(LB, 2, next), p: [NA, NA]};
        }
      }

      if (ps[0] === WO || ps[1] === WO) {
        wbm2.p[isEven] = ps[Number(ps[0] === WO)]; // advance winner
        wbm1.m = (ps[0] === WO) ? [0, 1] : [1, 0]; // set WO score in wbm1

        if (last >= LB) {
          lbm1.p[isEven] = WO; // wo marker 'lost', so goes to LBR1
          if (lbm1.p[0] === WO && lbm1.p[1] === WO) { // only true in the second iteration => i is even
            lbm2.p[Number(!isEven)] = WO; // rare, double wo marker in LBR1 (uses reverse positioning to LBR1)
            lbm1.m = [1, 0]; // randomly score one as the winner
          }
        }
      }

      games.push(wbm1);
      // progressed shells pushed to games every other iteration
      if (isEven) {
        games.push(wbm2);
        if (last >= LB) {
          games.push(lbm1, lbm2);
        }
      }
    }
  }());

  // remaining WB rounds (which never get WO markers from first fill-in)
  if (n >= 3) {
    for (var r = 3; r <= n; r += 1) {
      for (var g = 1; g <= Math.pow(2, n - r); g += 1) {
        games.push({id: gId(WB, r, g), p: [NA, NA]});
      }
    }
  }

  if (last >= LB) {
    if (n > 2) { // otherwise we only need the final games added
      for (var r = 3; r <= 2*n - 2; r += 1) {
        // number of games halves every odd round in losers bracket
        for (var g = 1; g <= Math.pow(2, n - 1 - Math.floor((r + 1) / 2)); g += 1) {
          games.push({id: gId(LB, r, g), p: [NA, NA]});
        }
      }
    }
    games.push({id: gId(LB, 2*n - 1, 1), p: [NA, NA]}); // grand final game 1
    games.push({id: gId(LB, 2*n, 1), p: [NA, NA]});     // grand final game 2
  }
  return games.sort(T.compareGames); // sort so they can be scored in order
};

// progression helpers, winner in `id` goes right to returned id or tournament over
var right = function (last, p, id, longLbGf) {
  var b = id.b, r = id.r, g = id.g;

  if (r < 1 || g < 1) {
    console.error("bad game identifier:" + T.representation(b, r, g));
    return null;
  }
  // in maximum round number in single elimination - nothing upcomping
  console.log(last, p, id.b, id.r, id.g);
  if ((last === WB && r >= p) || (last === LB && b === LB && r >= 2*p)) {
    return null;
  }
  // special case of WB winner moving to LB GF G1
  if (last >= LB && b === WB && r === p) {
    return [gId(LB, 2*p - 1, 1), 0];
  }
  // LB GF G1 won by WB winner => no GF G2
  if (b === LB && r === 2*p - 1 && !longLbGf) {
    return null;
  }

  var ghalf = (b === LB && $.odd(r)) ? g : Math.floor((g + 1) / 2);

  var pos;
  if (b === WB) {
    pos = (g + 1) % 2; // normal WB progression
  }
  else if (r === 2*p - 2) {
    pos = 1; // LB final winner => bottom of GF
  }
  else if (r === 2*p - 1) {
    pos = 0; // GF(1) winner moves to the top [semantic]
  }
  else if (r > 1 && $.odd(r)) {
    pos = 1; // winner usually takes bottom position in LB
  }
  else if (r === 1) {
    pos = g % 2; // first rounds LB sometimes goto bottom
  }
  else {
    pos = (g + 1) % 2; // normal progression only in even rounds
  }

  // normal progression
  return [gId(b, r + 1, ghalf), pos];
};

var down = function (last, p, id, longLbGf) {
  var b = id.b, r = id.r, g = id.g;

  // is player out?
  if (last === WB) {
    return null;
  }
  if (r === 2*p - 1) {
    // if double final, then loser moves to the bottom
    return (longLbGf) ? [gId(LB, 2 * p, 1), 1] : null;
  }
  if (b === LB || r > p || r < 1) {
    // remaining out cases + invalids
    return null;
  }

  // drop on top >R2 and <=2 for odd g to match bracket movement
  var pos = (r > 2 || $.odd(g)) ? 0 : 1;

  if (r === 1) {
    var ghalf = Math.floor((g + 1) / 2);
    return [gId(LB, 1, ghalf), pos]; // LBR1 only gets input from WBR1
  }
  return  [gId(LB, (r - 1)*2, g), pos]; // WBRr -> 2x as late per round in WB
};

// opt-in safety
var scorable = function (last, p, gs, id) {
  var m = $.firstBy(T.byId.bind(null, id), gs);
  if (m && m.p && m.p.every($.notElem([WO, NA]))) {
    // match exists and is ready to be scored
    var nextM = $.firstBy(T.byId.bind(null, right(last, p, id)), gs);
    return !nextM || !nextM.p.every($.notElem([WO, NA])); // not all players filled in in next
  }
  return false;
};

// updates games by updating the given match, and propagate the winners/losers
var score = function (last, p, gs, id, score) {
  // 0. sanity check
  var m = $.firstBy(T.byId.bind(null, id), gs);
  if (!m) {
    console.error(T.representation(id) + " match not found in tournament");
    return false;
  }
  if (m.p[0] === WO || m.p[1] === WO) {
    console.error("cannot override score walkover'd game: " + T.representation(id));
    return false;
  }
  if (!Array.isArray(score) || score.length !== 2)  {
    console.error("invalid scores: must be array of length 2 - got: " + JSON.stringify(score));
    return false;
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric) || score[0] === score[1]) {
    console.error("invalid player scores: both must be numeric and different - got: " + JSON.stringify(score));
    return false;
  }

  // 1. score given game
  m.m = score; // only map scores are relevant for progression

  // calculate winner and loser for progression
  var w = (score[0] > score[1]) ? m.p[0] : m.p[1]
    , l = (score[0] > score[1]) ? m.p[1] : m.p[0];

  // did underdog win GF1? Then override and force progression fns to move to GF2.
  var longLbGf = (id.b === LB && id.r === 2*p - 1 && score[1] > score[0]);

  // helper to insert player adv into [id, pos] and warn if the match does not exist
  var playerInsert = function (where, adv) {
    if (!where) {
      return true; // nothing to do
    }

    // we got valid results from progression function, we should be able to insert
    var id = where[0]
      , pos = where[1]
      , insertM = $.firstBy(T.byId.bind(null, id), gs);

    if (!insertM) {
      throw new Error("tournament corrupt: " + T.representation(id) + " not found!");
      return false;
    }
    insertM.p[pos] = adv;
    if (insertM.p[(pos + 1) % 2] === WO) {
      insertM.m = (pos) ? [0, 1] : [1, 0]; // set WO map scores

      // return id and wo winner so that it can be forwarded on
      return [insertM.id, adv];
    }
  };

  // 2. move winner right
  if (playerInsert(right(last, p, id, longLbGf), w)) {
    return false; // tournament corrupt
  }

  // 3. move loser down if applicable
  var dres = playerInsert(down(last, p, id, longLbGf), l);

  // 4. check if loser must be forwarded from existing WO in LBR1/LBR2
  // only WO fw case, non-WO match winner can never right onto a WO match
  if (dres && Array.isArray(dres)) {
    playerInsert(right(last, p, dres[0], false), dres[1]);
  }
  else if (!dres) {
    return false; // corrupt
  }
  return true;
};

// players (potential) max round in the last bracket of a tournament -> placement
var placement = function (last, p, maxr) {
  if (last === LB) {
    if (maxr === 2*p + 1) return 1;
    if (maxr === 2*p)     return 2;

    var metric = 2*p + 1 - maxr;
    var r = metric - 4;
    var k = Math.floor((r + 1)/2);
    var oddExtra = ($.odd(r)) ? 0 : Math.pow(2, k);
    return (metric <= 4) ? metric : Math.pow(2, k + 1) + 1 + oddExtra;
  }
  // last === WB
  return (maxr === p + 1) ? 1 : Math.pow(2, p - maxr) + 1;
};

// can be called at any time, but before the final game, it's just statistics
// should be called at the end of each round at most though for sanity of stats..
var results = function (last, p, gs) {
  // size = maximal player number found in tournament (<= 2^p because of model fitting)
  // all p exist in round one, so suffices to scan one of the first 2^(p-1) games
  var size = $.maximum($.flatten($.pluck('p', gs.slice(0, Math.pow(2, p - 1)))));

  var res = [];
  for (var s = 0; s < size; s += 1) {
    res[s] = {
      seed : s + 1
    , maps : 0
    //, best : 0  // not clear what is best, need the system to come in here or reference instead
    , wins : 0
    , maxr : 1 // temporary stat to keep track of last round
    };
  }

  for (var i = 0; i < gs.length; i += 1) {
    var g = gs[i];
    if (!g.m || g.p[0] === WO || g.p[1] === WO) {
      continue; // only count played, non-wo'd games
    }

    // store zero indexed player ids to do the conversion once and for all
    var p0 = g.p[0] - 1
      , p1 = g.p[1] - 1
      , w = (g.m[0] > g.m[1]) ? p0 : p1
      , l = (g.m[0] > g.m[1]) ? p1 : p0;

    // inc wins
    res[w].wins += 1;
    res[p0].maps += g.m[0];
    res[p1].maps += g.m[1];

    // max round a player got to
    if (g.id.b === last) {
      res[w].maxr = Math.max(res[w].maxr, g.id.r + 1);
      res[l].maxr = Math.max(res[l].maxr, g.id.r);
    }
  }

  // figure out position based on their max round..
  for (var k = 0; k < res.length; k += 1) {
    res[k].pos = placement(last, p, res[k].maxr);
    delete res[k].maxr;
  }

  return res.sort($.comparing('pos'));
};

// abstracting away tournament parameters and tournament power
function Duel(numPlayers, lastBracket, games) {
  // TODO: secure up these parameters?
  this.p = Math.ceil(Math.log(numPlayers) / Math.log(2));
  this.last = lastBracket;
  this.games = games || elimination(numPlayers, lastBracket);
}

// an instance can be serialized directly by storing inst.games
Duel.fromGames = function (games) {
  var last = $.maximumBy(function (x, y) {
    return x.id.r - y.id.r;
  }, games).id.r;
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new Duel(numPlayers, last, games));
};

Duel.prototype.scorable = function (id) {
  return scorable(this.last, this.p, this.games, id);
};

Duel.prototype.score = function (id, mapScore) {
  return score(this.last, this.p, this.games, id, mapScore);
};

Duel.prototype.results = function () {
  return results(this.last, this.p, this.games);
};

module.exports = Duel;
