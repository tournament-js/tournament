var $ = require('interlude')
  , T = require('./common')
  , G = require('./groups')
  , t = require('typr');

var unspecify = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, T.NA);
  });
};

var elimination = function (np, grs, adv) {
  if (np <= 2 || grs <= 2 || np <= grs || adv >= grs || adv <= 0) {
    console.error("invalid ffa configuration: players=" + np + ", groupsize=" + grs + ", advancing=" + adv);
    return;
  }
  var games = []
    , grps = G.groups(np, grs);

  // create each round iteratively
  for (var r = 1; grps.length > 1; r += 1) {
    if (r > 1) {
      grps = unspecify(grps);
    }
    for (var i = 0; i < grps.length; i += 1) {
      games.push({id: {b: T.WB, r: r, g: i + 1}, p: grps[i]}); // +1 as game numbers are 1-indexed
    }

    // prepare for the next round, G.groups may adjust grs internally, we find best adv
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
    grps = unspecify(G.groups(grps.length * bestA, grs));
  }
  games.push({id: {b: T.WB, r: r, g: 1}, p: grps[0]}); // grand final
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
var score = function (gs, id, score) {
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

  if (m.p.some($.eq(T.NA))) {
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
    var nextSeeded = G.groups(top.length, grs);

    // now loop through these and match each group up with the right game in nxtRnd
    for (var k = 0; k < nextSeeded.length; k += 1) {
      nxtRnd[k].p = []; // reset the player array in this match, will re-add in inner loop

      var match = nextSeeded[k];
      for (var j = 0; j < match.length; j += 1) {
        var seed = match[j];
        // nextSeeded is a group in G.groups so elements are seed numbers
        // map it to the corr. top position from last round and add to player array
        nxtRnd[k].p.push(top[seed - 1]);
      }
    }
  }
};

var scorable = function (gs, id) {
  var m = $.firstBy(T.byId.bind(null, id), gs);
  if (m && m.p && m.p.every($.neq(T.NA))) {
    // match exists and is ready to be scored

    var scoredInNext = gs.filter(function (g) {
      return g.id.r === id.r + 1 && g.m;
    }).length;
    return !scoredInNext;
  }
  return false;
};


var results = function (size, gs) {
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

  var rounds = [];
  gs.forEach(function (g) {
    if (!rounds[g.id.r - 1]) {
      rounds[g.id.r - 1] = [];
    }
    rounds[g.id.r - 1].push(g);
  });
  var maxround = rounds.length;

  // helpers for round loop
  var isReady = function (rnd) {
    return rnd.some(function (g) { // suffices to use .some since scoreFfa only propagates at end
      return g.p.some($.neq(T.NA));  // players exist => previous round is scored
    });
  };
  var getRndSize = function (rnd) {
    return $.sum(rnd.map(function (g) {
      return g.p.length;
    }));
  };

  // push top X from each round backwards from last round
  var posCtr = 1; // start with winner and go down
  var prevRoundSize = 0;
  for (var k = maxround; k > 0 ; k -= 1) { // round 1-indexed
    var rnd = rounds[k - 1];
    var roundSize = getRndSize(rnd);
    var resEl;

    if (k === maxround && rnd[0].m) {
      var gf = rnd[0];
      var winners = $.zip(gf.p, gf.m).sort($.comparing('1', -1));
      for (var w = 0; w < winners.length; w += 1) {
        resEl = res[winners[w][0] - 1]; // winners[w][0] gets a seed number then 0 index it
        resEl.pos = w + 1;
      }
    }
    else if (isReady(rnd)) {
      var rndPls = $.flatten($.pluck('p', rnd));
      // store round winners in order (the ones not stored already) the .pos in res[seed-1]
      for (var l = 0; l < rndPls.length; l += 1) {
        resEl = res[rndPls[l] - 1];
        if (k === maxround) {
          resEl.pos = rnd[0].p.length; // let final match tie at last place before scoring
        }
        else if (resEl.pos === size) {
          resEl.pos = posCtr;
        }
      }
    }
    posCtr += roundSize - prevRoundSize;
    prevRoundSize = roundSize;
  }
  return res.sort($.comparing('pos'));
};


// or FFA(numPlayers, games)
function FFA(numPlayers, groupSize, advancers) {
  this.numPlayers = numPlayers;
  if (Array.isArray(groupSize)) {
    this.games = groupSize;
  }
  else {
    this.games = elimination(numPlayers, groupSize, advancers);
  }
}

FFA.fromGamesArray = function (games) {
  var numPlayers = $.maximumBy(function (x, y) {
    return $.maximum(x.p) - $.maximum(y.p);
  });
  return (new FFA(numPlayers, games));
};

FFA.prototype.scorable = function (id) {
  return scorable(this.games, id);
};

FFA.prototype.score = function (id, mapScore) {
  return score(this.games, id, mapScore);
};

FFA.prototype.results = function () {
  return results(this.numPlayers, this.games);
};

module.exports = FFA;