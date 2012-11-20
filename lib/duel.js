var log = require('logule').init(module)
  , T = require('./common')
  , $ = require('interlude');

// Make easy access constants available  directly
var WB = T.WB
  , LB = T.LB
  , NA = T.NA
  , WO = T.WO;

// map last bracket num to elimination type
var brackets = [
  'invalid', // put this in here so the Array is aligned right
  'single',
  'double',
  'triple'   // not supported atm
];


// mark players that had to be added to fit model as WO's
var woMark = function (ps, size) {
  return ps.map(function (p) {
    return (p > size) ? WO : p;
  });
};

// shortcut to create a match id as duel tourneys are very specific about locations
var gId = function (b, r, m) {
  return {s: b, r: r, m: m};
};

var representation = function (id) {
  var rep = "";
  if (id.s === T.WB) {
    rep = "WB ";
  }
  else if (id.s === T.LB) {
    rep = "LB ";
  }
  // else assume no bracket identifier wanted
  return (rep + "R" + id.r + " M" + id.m);
};

// -----------------------------------------------------------------------------
// duel elimination stuff

// helpers to initialize duel tournaments
// http://clux.org/entries/view/2407
var evenSeed = function (i, p) {
  var k = Math.floor(Math.log(i) / Math.log(2))
    , r = i - Math.pow(2, k);
  if (r === 0) {
    return Math.pow(2, p - k);
  }
  var nr = (i - 2*r).toString(2).split('').reverse().join('');
  return (parseInt(nr, 2) << p - nr.length) + Math.pow(2, p - k - 1);
};

// get initial players for match i in a power p duel tournament
// NB: match number i is 1-indexed - VERY UNDEFINED for i<=0
var seeds = function (i, p) {
  var even = evenSeed(i, p);
  return [Math.pow(2, p) + 1 - even, even];
};

var makeFirstRounds = function (size, p, last) {
  var model = Math.pow(2, p) // model >= size (equals iff size is a power of 2)
    , matches = []
    , lbm1, lbm2, wbm2; // placeholders for LBR1, LBR2 & WBR2 (used in even itrs)

  for (var i = 1; i <= model / 2; i += 1) {
    var ps = woMark(seeds(i, p), size)
      , isEven = Number(i % 2 === 0)
      , wbm1 = {id: gId(WB, 1, i), p: ps};

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
        if (lbm1.p[0] === WO && lbm1.p[1] === WO) {
          // NB: here in even itrs when we have rare 2x WO markers in an LBR1 match
          lbm2.p[Number(!isEven)] = WO; // pass it on (w/LBR2's inverse propagation)
          lbm1.m = [1, 0]; // randomly score one as the winner
        }
      }
    }

    matches.push(wbm1);
    // progressed shells pushed to matches every other iteration
    if (isEven) {
      matches.push(wbm2);
      if (last >= LB) {
        matches.push(lbm1, lbm2);
      }
    }
  }
  return matches;
};

// return an array of matches for a tournament
// a match has the form {p: playerArray, s: bracketNum, r: roundNum, m: matchNum}
// bracket, round and match number are 1 indexed
var elimination = function (size, p, last, isLong) {
  if (size < 4) {
    log.error("duel tournaments must have at least 4 players");
    return [];
  }
  if ([WB, LB].indexOf(last) < 0) {
    log.error("invalid last duel elimination bracket; use t.WB or t.LB");
    return []; // triple elimination or other variants not implemented
  }

  log.trace('creating %dp %s elimination tournament', size, brackets[last]);
  // create round 1,2 in WB & LB
  var matches = makeFirstRounds(size, p, last);

  // remaining WB rounds (which never get WO markers from first fill-in)
  var r, g;
  for (r = 3; r <= p; r += 1) {
    for (g = 1; g <= Math.pow(2, p - r); g += 1) {
      matches.push({id: gId(WB, r, g), p: [NA, NA]});
    }
  }
  if (last === WB && isLong) {
    matches.push({id: gId(LB, 1, 1), p: [NA, NA]});       // bronze final
  }

  if (last >= LB) {
    for (r = 3; r <= 2*p - 2; r += 1) {
      // number of matches halves every odd round in losers bracket
      for (g = 1; g <= Math.pow(2, p - 1 - Math.floor((r + 1) / 2)); g += 1) {
        matches.push({id: gId(LB, r, g), p: [NA, NA]});
      }
    }

    matches.push({id: gId(LB, 2*p - 1, 1), p: [NA, NA]}); // grand final match 1
    if (isLong) {
      matches.push({id: gId(LB, 2*p, 1), p: [NA, NA]});   // grand final match 2
    }
  }
  return matches.sort(T.compareMatches); // sort so they can be scored in order
};

// progression helpers, winner in `id` goes right to returned id or tournament over
var right = function (last, p, id, longLbGf) {
  var b = id.s, r = id.r, g = id.m;

  // cases where progression stops for winners
  var isFinalSe = (last === WB && r === p)
    , isFinalDe = (last === LB && b === LB && r === 2*p)
    , inBronze = (last === WB && b === LB)
    , inShortLbGf = (b === LB && r === 2*p - 1 && !longLbGf);

  if (isFinalSe || isFinalDe || inBronze || inShortLbGf) {
    return null;
  }

  // special case of WB winner moving to LB GF G1
  if (last >= LB && b === WB && r === p) {
    return [gId(LB, 2*p - 1, 1), 0];
  }

  // for LB positioning
  var ghalf = (b === LB && $.odd(r)) ? g : Math.floor((g + 1) / 2);

  var pos;
  if (b === WB) {
    pos = (g + 1) % 2; // normal WB progression
  }
  else if (r === 2*p - 2) {
    pos = 1; // LB final winner => bottom of GF
  }
  else if (r === 2*p - 1) {
    pos = 0; // GF(1) winner moves to the top
  }
  else if (r === 1) {
    pos = g % 2; // LBR1 winners move inversely to normal progression
  }
  else if ($.odd(r)) {
    pos = 1; // winner usually takes bottom position in LB
  }
  else {
    pos = (g + 1) % 2; // normal progression only in even rounds
  }

  // normal progression
  return [gId(b, r + 1, ghalf), pos];
};

var down = function (last, p, id, hasBf, longLbGf) {
  var b = id.s, r = id.r, g = id.m;

  // knockouts / special finals
  if (last === b) {
    if (b === WB && hasBf && r === p - 1) {
      // if bronze final, move loser to "LBR1" at mirror pos of WBGF
      return [gId(LB, 1, 1), (g + 1) % 2];
    }
    if (b === LB && r === 2*p - 1 && longLbGf) {
      // if double final, then loser moves to the bottom
      return [gId(LB, 2 * p, 1), 1];
    }
    // otherwise always KO'd if loosing in last bracket
    return null;
  }

  // LB drops: on top for (r>2) and (r<=2 if odd g) to match bracket movement
  var pos = (r > 2 || $.odd(g)) ? 0 : 1;
  // LBR1 only fed by WBR1 (halves normally), else feed -> r=2x later (w/matching g)
  var dId = (r === 1) ? gId(LB, 1, Math.floor((g+1)/2)) : gId(LB, (r-1)*2, g);

  return [dId, pos];
};

// opt-in safety
var scorable = function (last, p, ms, id) {
  var m = $.firstBy(T.byId.bind(null, id), ms);

  // match exists, has both players, and is not already scored
  return (m && m.p && m.p.every($.notElem([WO, NA])) && !m.m);
  // NB: this ensures consistency if users can only .score() when .scorable()
  // as even the final cannot be rescored to a gf2 case unless it's overridden
};

// updates matches by updating the given match, and propagate the winners/losers
var score = function (last, p, ms, isLong, id, score) {
  // 0. sanity check
  var m = $.firstBy(T.byId.bind(null, id), ms)
    , idstr = representation(m.id)
    , passed = false;;

  if (!m) {
    log.error("match %s not found in tournament", idstr);
  }
  else if (m.p[0] === WO || m.p[1] === WO) {
    log.error("cannot override score in walkover'd match: %s", idstr);
  }
  else if (m.p[0] === NA || m.p[1] === NA) {
    log.error("missing players - cannot score not-ready match: %s", idstr);
  }
  else if (!Array.isArray(score) || !score.every(Number.isFinite)) {
    log.error("scores must be a numeric array: %j", score);
  }
  else if (score.length !== 2 || score[0] === score[1]) {
    log.error("need length 2 non-drawing scores: %j", score);
  }
  else {
    passed = true;
  }
  if (!passed) {
    return false;
  }

  log.trace("scoring %s in %dp elimination tournament", idstr, Math.pow(2, p));

  // 1. score given match
  m.m = score; // only map scores are relevant for progression

  // calculate winner and loser for progression
  var w = (score[0] > score[1]) ? m.p[0] : m.p[1]
    , l = (score[0] > score[1]) ? m.p[1] : m.p[0];

  // did underdog win GF1? Then override and force progression fns to move to GF2.
  var longLbGf = (isLong && id.s === LB && id.r === 2*p - 1 && score[1] > score[0]);

  // helper to insert player adv into [id, pos] and warn if the match does not exist
  var playerInsert = function (where, adv) {
    if (!where) {
      return true; // nothing to do
    }

    // we got valid results from progression function, we should be able to insert
    var id = where[0]
      , pos = where[1]
      , insertM = $.firstBy(T.byId.bind(null, id), ms);

    if (!insertM) {
      log.error("tournament corrupt: %s not found!", representation(id));
      return false;
    }
    insertM.p[pos] = adv;
    if (insertM.p[(pos + 1) % 2] === WO) {
      insertM.m = (pos) ? [0, 1] : [1, 0]; // set WO map scores

      // return id and wo winner so that it can be forwarded on
      return [insertM.id, adv];
    }
    return true;
  };

  // 2. move winner right
  if (playerInsert(right(last, p, id, longLbGf), w) !== true)  {
    return false; // tournament corrupt (as never WO's in WBRx for x >= 2)
  }

  // 3. move loser down if applicable
  var dres = playerInsert(down(last, p, id, isLong, longLbGf), l);

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
var placement = function (last, p, isLong, maxr) {
  if (last === LB) {
    if (isLong && maxr >= 2*p) {
      return (maxr === 2*p + 1) ? 1 : 2;
    }
    if (!isLong && maxr >= 2*p - 1) {
      return (maxr === 2*p) ? 1 : 2;
    }

    var metric = 2*p + 1 - maxr;
    var r = metric - 4;
    var k = Math.floor((r + 1)/2);
    var oddExtra = ($.odd(r)) ? 0 : Math.pow(2, k);
    return (metric <= 4) ? metric : Math.pow(2, k + 1) + 1 + oddExtra;
  }
  // last === WB
  if (isLong && maxr === p - 1) {
    return 4; // both can to rise to 3rd, but dont assume tied at 3rd when it exists
  }
  return (maxr === p + 1) ? 1 : Math.pow(2, p - maxr) + 1;
};

// can be called at any time, but before the final match, it's just statistics
// should be called at the end of each round at most though for sanity of stats..
var results = function (last, p, size, isLong, ms) {
  var res = [];
  for (var s = 0; s < size; s += 1) {
    // TODO: do best scores somehow?
    res[s] = {
      seed : s + 1
    , maps : 0
    , wins : 0
    , maxr : 1 // temporary stat to keep track of last round
    , inbf : false // temporary stat to keep track of if in bronze final
    };
  }

  for (var i = 0; i < ms.length; i += 1) {
    var g = ms[i];
    if (!g.m || g.p[0] === WO || g.p[1] === WO) {
      continue; // only count played, non-wo'd matches
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

    // max round a player not to
    if (g.id.s === last) {
      res[w].maxr = Math.max(res[w].maxr, g.id.r + 1);
      res[l].maxr = Math.max(res[l].maxr, g.id.r);
    }

    // bronze final
    if (isLong && last === WB && g.id.s === LB) {
      res[l].inbf = true;
      res[w].inbf = true;
      res[l].pos = 4;
      res[w].pos = 3;
    }
  }

  // figure out position based on their max round..
  for (var k = 0; k < res.length; k += 1) {
    if (!res[k].inbf) {
      res[k].pos = placement(last, p, isLong, res[k].maxr);
    }
    // otherwise placed more accurately when we found scored bf match
    delete res[k].maxr;
    delete res[k].inbf;
  }

  return res.sort($.comparing('pos'));
};

// upcoming match always exists in this as winners/losers are propagated immediately
var upcoming = function (ms, pId) {
  // a player is only ever in one unscored match for duel tournaments
  var match = $.firstBy(function (m) {
    return m.p.indexOf(pId) >= 0 && !m.m;
  }, ms);
  if (match) {
    return match.id;
  }
};


// abstracting away tournament parameters and tournament power
function Duel(numPlayers, lastBracket, isShort, matches) {
  this.numPlayers = numPlayers;
  this.p = Math.ceil(Math.log(numPlayers) / Math.log(2));
  this.last = lastBracket;

  // isLong is the default final behaviour, which can be turned off via isShort
  // isLong for WB === play bronze final?, isLong for LB === play gf2?
  this.isLong = !isShort;
  this.matches = matches || elimination(numPlayers, this.p, this.last, this.isLong);
}

// an instance can be serialized directly by storing inst.matches
Duel.fromJSON = function (matches) {
  if (!matches.length) {
    log.error("cannot recreate tournament - no matches found");
    return;
  }

  var lbLen = matches.filter(function (m) {
    return m.id.s === LB;
  }).length;
  var last = (lbLen > 1) ? LB : WB; // single elim. allowed one match in LB

  var numPlayers = $.maximum($.flatten($.pluck('p', matches)));
  var p = Math.ceil(Math.log(numPlayers) / Math.log(2));
  var gf2 = $.firstBy(T.byId.bind(null, {s: LB, r: 2*p, m: 1}), matches);

  var isShort = (last === WB && lbLen === 0) || (last === LB && !gf2);
  return (new Duel(numPlayers, last, isShort, matches));
};

Duel.prototype.scorable = function (id) {
  return scorable(this.last, this.p, this.matches, id);
};

Duel.prototype.score = function (id, mapScore) {
  return score(this.last, this.p, this.matches, this.isLong, id, mapScore);
};

// TODO: does not need to be member fn, could be static
Duel.prototype.representation = representation;

var roundNames = ["Finals", "Semi Finals", "Quarter Finals", "Round of "];
//var roundNames2 = ["Finals", "Semis", "Ro4", "Ro"];
var roundName = function (r, p, namesL10n) {
  var names = namesL10n || roundNames;
  return (r > p - 3) ? names[p - r] : names[3] + Math.pow(2, p - r);
};

Duel.prototype.isDone = function () {
  var gf = this.matches[this.matches.length - 1];
  if (Array.isArray(gf.m)) {
    return true; // if last match is scored, we're always done
  }
  // long double elimination final could have finished earlier
  var gf1 = this.matches[this.matches.length - 2];
  return (Array.isArray(gf1.m) && gf1.m[0] > gf1.m[1]);
};

Duel.prototype.roundName = function (r, namesL10n) {
  return roundName(r, this.p, namesL10n);
};

Duel.prototype.upcoming = function (playerId) {
  return upcoming(this.matches, playerId);
};

Duel.prototype.results = function () {
  return results(this.last, this.p, this.numPlayers, this.isLong, this.matches);
};

module.exports = Duel;
