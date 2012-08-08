var $ = require('interlude') // should only need autonomy + compare
  , t = require('typr')
  , eql = require('deep-equal')
  , T = {}; // exports

// helper fn
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

// returns an array of round representation arrays. Each containing all matches to be played in one round, filling in seeding numbers as player placeholders
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
      if (ps[i] >= 0 && ps[n - 1 - i] >= 0) {
        rs[j].push([ps[i], ps[n - 1 - i]]); // insert a full pair
      }
    }
    ps.splice(1, 0, ps.pop()); // permutate for next round
  }

  return rs;
};

// -----------------------------------
// constants for tournaments
const WB = 1
    , LB = 2;

const WO = -1;

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
var compareMatches = function (g1, g2) {
  return (g1.id.b - g2.id.b) || (g1.id.r - g2.id.r) || (g1.id.g - g2.id.g);
};

// return an array of matches for a tournament
// a match has the form {p: playerArray, b: bracketNum, r: roundNum, g: gameNum}
// bracket, round and game number are 1 indexed
T.elimination = function (num_players, last) {
  if (num_players < 4) {
    return [];
  }
  if ([1, 2].indexOf(last) < 0) {
    return []; // triple elimination or other variants not implemented
  }

  var n = Math.ceil(Math.log(num_players) / Math.log(2))
    , num = Math.pow(2, n)    // true model number
    , matches = [];           // match array

  // create round 1,2 in WB & LB
  (function init() {
    // placeholders for progression matches in WBR2, LBR1 & LBR2 used in even iterations,
    var lbm1, lbm2, wbm2;

    for (var i = 1; i <= num / 2; i += 1) {
      var ps = woMark(seeds(i, n), num_players)
        , isEven = Number(i % 2 === 0);

      matches.push({id: gId(WB, 1, i), p: ps}); // wbm1

      // create shells for WBR2, LBR1 & LBR2
      if (!isEven) {
        var next = (i+1) / 2;
        wbm2 = {id: gId(WB, 2, next), p: [0, 0]};

        if (last >= LB) {
          lbm1 = {id: gId(LB, 1, next), p: [0, 0]};
          lbm2 = {id: gId(LB, 2, next), p: [0, 0]};
        }
      }

      if (ps[0] === WO || ps[1] === WO) {
        wbm2.p[isEven] = ps[Number(ps[0] === WO)]; // advance winner

        if (last >= LB) {
          lbm1.p[isEven] = WO; // wo marker 'lost', so goes to LBR1
          if (lbm1.p[0] === WO && lbm1.p[1] === WO) { // only true in the second iteration => i is even
            lbm2.p[Number(!isEven)] = WO; // rare, double wo marker in LBR1 (uses reverse positioning to LBR1)
          }
        }
      }

      // shells pushed to matches every other iteration
      if (isEven) {
        matches.push(wbm2);
        if (last >= LB) {
          matches.push(lbm1, lbm2);
        }
      }
    }
  }());

  // remaining WB rounds (which never get WO markers from first fill-in)
  if (n >= 3) {
    for (var r = 3; r <= n; r += 1) {
      for (var g = 1; g <= Math.pow(2, n - r); g += 1) {
        matches.push({id: gId(WB, r, g), p: [0, 0]});
      }
    }
  }

  if (last >= LB) {
    if (n > 2) { // otherwise we only need the final matches added
      for (var r = 3; r <= 2*n - 2; r += 1) {
        // number of matches halves every odd round in losers bracket
        for (var g = 1; g <= Math.pow(2, n - 1 - Math.floor((r + 1) / 2)); g += 1) {
          matches.push({id: gId(LB, r, g), p: [0, 0]});
        }
      }
    }
    matches.push({id: gId(LB, 2*n - 1, 1), p: [0, 0]}); // grand final game 1
    matches.push({id: gId(LB, 2*n, 1), p: [0, 0]});     // grand final game 2
  }
  return matches.sort(compareMatches);
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
T.right = function (p, last, id, longLbGf) {
  var b = id.b, r = id.r, g = id.g;

  if (r < 1 || g < 1) {
    throw new Error("bad game identifier:" + T.representation(b, r, g));
  }
  // in maximum round number in single elimination - nothing upcomping
  if ((last === WB && r >= p) || (last === LB && b === LB && r >= 2*p)) {
    return null;
  }
  // special case of WB winner moving to LB GF G1
  if (last >= LB && br === WB && r === p) {
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

T.down = function (p, last, id, longLbGf) {
  var b = id.b, r = id.r, g = id.g;

  // is player out?
  if (last === WB) {
    return null;
  };

  if (r === 2*p - 1) {
    // if double final, then loser moves to the bottom
    return (longLbGf) ? [gId(LB, 2*p, 1), 1] : null;
  }

  // remaining out cases + invalids
  if (b === LB || r > p || r < 1) {
    return null;
  }

  var ghalf = Math.floor((g + 1) / 2);
  // drop on top >R2 and <=2 for odd g to match bracket movement
  var pos = (r > 2 || $.odd(g)) ? 0 : 1;

  if (r === 1) {
    return [gId(LB, 1, ghalf), pos]; // LBR1 only gets input from WBR1
  }
  return  [gId(LB, (r - 1)*2, g), pos]; // WBRr -> 2x as late per round in WB


};

// updates matches by updating the given match, and propagate the winners/losers
T.scoreDuel = function (ms, p, last, id, score) {
  // sanity
  if (!Array.isArray(score) || score.length !== 2)  {
    throw new Error("invalid scores: must be array of length 2 - got: " + JSON.stringify(score));
  }
  if (!score.every(t.isNumber) || !score.every(t.isNumeric) || score[0] === score[1]) {
    throw new Error("invalid player scores: both must be numeric and different - got: " + JSON.stringify(score));
  }

  // calculate winner and loser for progression
  var w = (score[0] > score[1]) ? m.p[0] : m.p[1]
    , l = (score[0] > score[1]) ? m.p[1] : m.p[0];

  // 1. score given game
  var m = $.firstBy(T.byId.bind(null, id), ms);
  if (!m) {
    throw new Error(T.representation(id) + " match not found in tournament");
  }
  m.s = score;

  // 2. move winner right
  var right = T.right(p, last, id, false)
  if (right) {
    var nxtId = right[0]
      , rPos = right[1];

    var nxtM = $.firstBy(T.byId.bind(null, nxtId), ms);
    if (nxtM) {
      nxtM.p[rPos] = w;
    }
  }

  // 3. move loser down if applicable
  var down = T.down(p, last, id)
  if (down) {
    var dnId = down[0]
      , dPos = down[1];

    var dnM = $.firstBy(T.byId.bind(null, dnId), ms);
    if (dnM) {
      dnM.p[dPos] = l;
    }
  }


  // 4. check if loser needs WO from LBR1
  // 5. check if loser needs WO from LBR2
  return ms;
};

module.exports = T;
