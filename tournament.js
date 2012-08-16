var $ = require('interlude') // should only need autonomy + compare
  , t = require('typr')
  , eql = require('deep-equal')
  , T = {}; // exports

T.groups = function (num_players, size) {
  if (!num_players || !size) {
    return [];
  }
  var num_groups = Math.ceil(num_players / size);
  // need the internal group size model used to be correct
  while (num_groups * size - num_players >= num_groups) {
    size -= 1;
  }

  var model = num_groups * size
    , groupList = [];

  for (var i = 0; i < num_groups; i += 1) {
    groupList.push([]);
  }

  // iterations required to fill groups
  for (var j = 0; j < Math.ceil(size / 2); j += 1) {
    // fill each group with pairs that sum to model + 1
    // until you are in the last iteration (in which may only want one of them)
    for (var g = 0; g < num_groups; g += 1) {
      var a = j*num_groups + g + 1;

      groupList[g].push(a);
      if (groupList[g].length < size) {
        groupList[g].push(model + 1 - a);
      }
    }
  }

  // remove non-present players and sort by seeding number
  return groupList.map(function (g) {
    return g.sort($.compare()).filter(function (p) {
      return p <= num_players;
    });
  });
};

// returns an array of round representation arrays. Each containing all games to be played in one round, filling in seeding numbers as player placeholders
// each match array (the innermost one) if of the form [player1, player2]
// follows http://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
T.robin = function (n) {  // num players
  var ps = $.range(n)     // player array
    , rs = [];            // round array

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

// -----------------------------------------------------------------------------
// general tournament helpers

// constants for tournaments
/*const WB = 1
    , LB = 2
    , WO = -1
    , NA = 0*/

var WB = 1, LB = 2, WO = -1, NA = 0;

// export constants
T.WB = WB;
T.LB = LB;
T.WO = WO;

// mark players that had to be added to fit model as WO's
var woMark = function (ps, num_players) {
  return ps.map(function (p) {
    return (p > num_players) ? WO : p;
  });
};

// shortcut to create a game id
var gId = function (b, r, g) {
  return {b: b, r: r, g: g};
};

// only need to check if a game has the given id, not complete equality
T.byId = function (id, g) {
  return eql(id, g.id);
};

// sorting is chronological, and as you normally read it: WB R2 G3
// => first bracket, then round, then game.
var compareGames = function (g1, g2) {
  return (g1.id.b - g2.id.b) || (g1.id.r - g2.id.r) || (g1.id.g - g2.id.g);
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
var seeds = function (i, pow, num_players) {
  var even = even_seed(i, pow);
  return [Math.pow(2, pow) + 1 - even, even];
};

// return an array of games for a tournament
// a match has the form {p: playerArray, b: bracketNum, r: roundNum, g: gameNum}
// bracket, round and game number are 1 indexed
T.duelElimination = function (last, num_players) {
  if (num_players < 4) {
    return [];
  }
  if ([1, 2].indexOf(last) < 0) {
    return []; // triple elimination or other variants not implemented
  }

  var n = Math.ceil(Math.log(num_players) / Math.log(2))
    , num = Math.pow(2, n)    // true model number
    , games = [];           // match array

  // create round 1,2 in WB & LB
  (function init() {
    // placeholders for progression games in WBR2, LBR1 & LBR2 used in even iterations,
    var lbm1, lbm2, wbm2;

    for (var i = 1; i <= num / 2; i += 1) {
      var ps = woMark(seeds(i, n), num_players)
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
  return games.sort(compareGames); // sort so they can be scored in order
};

T.representation = function (id) {
  var rep = "";
  if (id.b === WB) {
    rep = "WB ";
  }
  else if (id.b === LB) {
    rep = "LB ";
  }
  // else assume no bracket identifier wanted
  return rep += "R" + id.r + " G" + id.g;
};

// progression helpers, winner in `id` goes right to returned id or tournament over
T.right = function (last, p, id, longLbGf) {
  var b = id.b, r = id.r, g = id.g;

  if (r < 1 || g < 1) {
    throw new Error("bad game identifier:" + T.representation(b, r, g));
  }
  // in maximum round number in single elimination - nothing upcomping
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

T.down = function (last, p, id, longLbGf) {
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

// updates games by updating the given match, and propagate the winners/losers
T.scoreDuel = function (last, p, gs, id, score) {
  // sanity
  if (!Array.isArray(score) || score.length !== 2)  {
    throw new Error("invalid scores: must be array of length 2 - got: " + JSON.stringify(score));
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric) || score[0] === score[1]) {
    throw new Error("invalid player scores: both must be numeric and different - got: " + JSON.stringify(score));
  }

  // 1. score given game
  var m = $.firstBy(T.byId.bind(null, id), gs);
  if (!m) {
    throw new Error(T.representation(id) + " match not found in tournament");
  }
  if (m.p[0] === WO || m.p[1] === WO) {
    console.error("cannot override score walkover'd game: " + T.representation(id));
    return gs;
  }
  m.m = score; // only map scores are relevant for progression

  // calculate winner and loser for progression
  var w = (score[0] > score[1]) ? m.p[0] : m.p[1]
    , l = (score[0] > score[1]) ? m.p[1] : m.p[0];

  // did underdog win GF1? Then override and force progression fns to move to GF2.
  var longLbGf = (id.b === LB && id.r === 2*p - 1 && score[1] > score[0]);

  // helper to insert player adv into [id, pos] and warn if the match does not exist
  var playerInsert = function (where, adv) {
    if (!where) {
      return; // nothing to do
    }

    // we got valid results from progression function, we should be able to insert
    var id = where[0]
      , pos = where[1]
      , insertM = $.firstBy(T.byId.bind(null, id), gs);

    if (!insertM) {
      console.error("tournament corrupt: " + T.representation(id) + " not found!");
      return;
    }
    insertM.p[pos] = adv;
    if (insertM.p[(pos + 1) % 2] === WO) {
      insertM.m = (pos) ? [0, 1] : [1, 0]; // set WO map scores

      // return id and wo winner so that it can be forwarded on
      return [insertM.id, adv];
    }
  };

  // 2. move winner right
  playerInsert(T.right(last, p, id, longLbGf), w);

  // 3. move loser down if applicable
  var dres = playerInsert(T.down(last, p, id, longLbGf), l);

  // 4. check if loser must be forwarded from existing WO in LBR1/LBR2
  // only WO fw case, non-WO match winner can never T.right onto a WO match
  if (dres) {
    playerInsert(T.right(last, p, dres[0], false), dres[1]);
  }
};

T.scorable = function (last, p, id) {
  // check if the match with that id has both players and none of them are WOs
  // check if T.next(p, last, id, true)
  return false;
};

// players (potential) max round in the last bracket of a tournament -> placement
T.placement = function (last, p, maxr) {
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
T.duelResults = function (last, p, gs) {
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
    res[k].pos = T.placement(last, p, res[k].maxr);
    delete res[k].maxr;
  }

  return res.sort($.comparing('pos'));
};


// enforce max power 7 for sensibility
// => max r = 256 (in GFG2), max g = 128 (in R1), max p = 128
/*var Game = new Schema({
  id : {
    b   : {type: Number, required: true, min: T.WB, max: T.LB}
  , r   : {type: Number, required: true, min: 1, max: 256}
  , g   : {type: Number, required: true, min: 1, max: 128}
  }
, r  : String // straigt from T.representation
, d  : Date   // scheduled play date

  // the following are ordered jointly and can be zipped
, p  : [Number]   // should be between 1 and 128 to match nice seed numbers
, m  : [Number]   // map wins in duel and overall / summed result in ffa
, s  : [[Number]] // scores list of map results one score list per player
});

// higher level structure
var Tournament = new Schema({
  games   : [Game]
, ongoing : Boolean
, results : [PlayerResult] // from one of the results functions
, system  : Number    // scoring system: time asc, time desc, points asc, points desc
, size    : Number    // number of players (keeps structure simple and disjoint from invitemaps..)
});

var PlayerResult = new Schema({
  seed   : Number // in {1, .. , size}
, pos    : Number // final tournament position
, maps   : Number // number of maps taken in duel
, sum    : Number // sum of results in ffa
, best   : Number // best game score (from all matching game.r entries)
, wins   : Number // number of game wins
});*/

// -----------------------------------------------------------------------------
// ffa tournaments

var zeroOut = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, NA);
  });
};

T.ffaElimination = function (grs, adv, np) {
  if (np <= 2 || grs <= 2 || np <= grs || adv >= grs || adv <= 0) {
    console.error("invalid ffa configuration: players=" + np + ", groupsize=" + grs + ", advancing=" + adv);
    return;
  }
  var games = []
    , grps = T.groups(np, grs);

  // create each round iteratively
  for (var r = 1; grps.length > 1; r += 1) {
    if (r > 1) {
      grps = zeroOut(grps);
    }
    for (var i = 0; i < grps.length; i += 1) {
      games.push({id: {b: WB, r: r, g: i + 1}, p: grps[i]}); // +1 as game numbers are 1-indexed
    }

    // prepare for the next round, T.groups may adjust grs internally, we find best adv
    var minsize = $.minimum($.pluck('length', grps));

    // metric to determine the best adv for the next groups call uses 2 factors:
    // - distance from requested adv => best - adv
    // - how close the groups are to filled => (best * grps.length) % grs
    // we weight these factors by 2 and 1 resp.
    var bestA = Math.max(1, adv - (grs - minsize)); // ok starting point, 1 adv worst case fallback
    var bestMetric = 2*Math.abs(bestA - adv) + ((bestA * grps.length) % grs);
    for (var a = adv; a > 0; a -= 1) {
      if (a >= minsize) {
        continue; // need to actually eliminate something in each match..
      }
      var nMetric = 2*Math.abs(a - adv) + ((a * grps.length) % grs);
      if (nMetric < bestMetric) { // better candidate
        bestMetric = nMetric;
        bestA = a;
      }
    }
    grps = zeroOut(T.groups(grps.length * bestA, grs));
  }
  games.push({id: {b: WB, r: r, g: 1}, p: grps[0]}); // grand final
  return games;
};

// how many advances from the current round (filter of gs) to the next round (ditto)
// returns adv which is <= what was requested due to model optimization
var advancing = function (currRnd, nxtRnd) {
  var slots = $.flatten($.pluck('p', nxtRnd)).length; // how many that's expected
  var adv = slots / currRnd.length; // how many to take from each group (is always divisible)
  return adv;
};

// like other score function, modifies gs
T.scoreFfa = function (gs, id, score) {
  // 1. score given game
  var m = $.firstBy(T.byId.bind(null, id), gs);
  if (!m) {
    throw new Error(T.representation(id) + " match not found in tournament");
  }

  // sanity
  if (!Array.isArray(score) || score.length !== m.p.length)  {
    throw new Error("invalid scores: must be array of player length - got: " + JSON.stringify(score));
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric)) {
    throw new Error("invalid player scores: all must be numeric - got: " + JSON.stringify(score));
  }

  if (m.p.some($.eq(NA))) {
    console.error("cannot score not fully filled in game: " + T.representation(id));
    return gs;
  }

  m.m = score; // only map scores are relevant for progression

  // if all games in this round were scored, fill in next round's slots with the advancing players
  var currRnd = gs.filter(function (g) {
    return g.id.r === id.r;
  });
  var rndScored = currRnd.every(function (g) {
    return g.m; // map score exists
  });

  // TODO: checks that nxtRnd isn't scored before doing this?
  if (rndScored) {
    var nxtRnd = gs.filter(function (g) {
      return (g.id.r === id.r + 1);
    });
    var adv = advancing(currRnd, nxtRnd);

    var top = [];
    for (var i = 0; i < currRnd.length; i += 1) {
      var topAdv = $.zip(currRnd[i].p, currRnd[i].m).sort($.comparing('1', -1)).slice(0, adv);
      top = top.concat(topAdv);
    }
    top = $.pluck(0, top.sort($.comparing('1', -1))); // sorted overalls, serves as a replacement seed map

    // safe to recreate groups using a possibly smaller group size than the original requested
    // because it was determined during construction that the model needed reducing then!
    var grs = $.maximum($.pluck('length', $.pluck('p', nxtRnd)));
    var nextSeeded = T.groups(top.length, grs);

    // now loop through these and match each group up with the right game in nxtRnd
    for (var k = 0; k < nextSeeded.length; k += 1) {
      nxtRnd[k].p = []; // reset the player array in this match, will re-add in inner loop

      var match = nextSeeded[k];
      for (var j = 0; j < match.length; j += 1) {
        var seed = match[j];
        // nextSeeded is a group in T.groups so elements are seed numbers
        // map it to the corr. top position from last round and add to player array
        nxtRnd[k].p.push(top[seed - 1]);
      }
    }
  }
};


T.ffaResults = function (gs, size) {
  // size = maximal player number found in tournament round 1, passed in for now..

  var res = [];
  for (var s = 0; s < size; s += 1) {
    res[s] = {
      seed : s + 1
    , sum : 0
    //, best : 0  // not clear what is best, need the system to come in here or reference instead
    , wins : 0
    , pos  : size // initialize to last place if no rounds played
    };
  }
  var maxround = $.maximumBy(function (x, y) {
    return x.id.r - y.id.r;
  }, gs).id.r;

  for (var i = 0; i < gs.length; i += 1) {
    var g = gs[i];
    if (!g.m) {
      continue; // only count played games (WO markers don't exist in FFA)
    }

    var top = $.zip(g.p, g.m).sort($.comparing('1', -1));
    for (var j = 0; j < top.length; j += 1) {
      var pJ = top[j][0] - 1  // convert seed -> zero indexed player number
        , mJ = top[j][1];     // map wins for pJ

      // inc wins
      res[pJ].wins += top.length - j - 1; // ffa wins === number of player below
      res[pJ].sum += mJ;
    }
  }

  // push top X from each round backwards from last round
  var posCtr = 1; // start with winner and go down
  var uncounted = 0; // number of players in skipped rounds
  // helpers for round loop
  var isReady = function (rnd) {
    return rnd.every(function (g) {
      return g.m;
    });
  };
  var getRnd = function (r) {
    return gs.filter(function (g) {
      return g.id.r === r;
    });
  };
  var getRndSize = function (rnd) {
    return $.sum(rnd.map(function (g) {
      return g.p.length;
    }));
  };
  var getRndTop = function (rnd) {
    var rndZip = rnd.map(function (g) {
      return $.zip(g.p, g.m);
    });
    return $.flatten(rndZip).sort($.comparing('1', -1));
  };

  for (var k = maxround; k > 0 ; k -= 1) { // round 1-indexed
    var rnd = getRnd(k);
    var roundSize = getRndSize(rnd);

    if (!isReady(rnd)) {
      posCtr += roundSize;
      uncounted += roundSize;
      continue;
    }

    var rndTop = getRndTop(rnd);

    // store round winners in order (the ones not stored already) the .pos in res[seed-1]
    for (var l = 0; l < rndTop.length; l += 1) {
      var resIdx = rndTop[0][l] - 1; // === seed - 1;
      if (res[resIdx].pos !== size) {
        res[resIdx].pos = posCtr;

        // first finished round all tie at position equal to the sum of players meant to go further
        // by keeping track of how many in each round above, and only incrementing pos after exhausting those
        if (uncounted > 0) {
          uncounted -= 1;
        }
        else {
          posCtr += 1;
        }
      }
      // otherwise already stored in later round, dont mess with their position
    }
  }
  // if (uncounted === size) return res.sort($.comparing('maps')) // first round not finished?

  return res.sort($.comparing('pos'));
};




module.exports = T;
