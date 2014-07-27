var Tournament = require(process.env.TOURNAMENT_COV ? '../tournament-cov' : '../');

var SomeT = Tournament.sub('SomeT', function (opts, initParent) {
  this.opts = opts;
  var ms = [
    { id: { s: 1, r: 1, m: 1 }, p: [1,2] },
    { id: { s: 1, r: 1, m: 2 }, p: [3,4] },
  ];
  initParent(ms);
});
SomeT.prototype._verify = function (match) {
  if (match.id.m === 2) {
    return "Cannot score match 2"; // for the lulz
  }
  return null;
};

SomeT.prototype._progress = function (match) {
  this.opts.progressCalled(match);
};
SomeT.defaults = function (np, opts) {
  opts = opts || {};
  opts.progressCalled = opts.progressCalled || function () {};
  return opts;
};

var attachInvalid = function () {
  SomeT.invalid = function (numPlayers/*, opts*/) {
    if (!Tournament.isInteger(numPlayers) || numPlayers < 2) {
      return "Need at least 2 players";
    }
    return null;
  };
};

exports.sub = function (t) {
  t.expect(15); // so we know if some stuff never happened

  // ensure we have to implement invalid
  try { new SomeT(4); }
  catch (e) {
    t.equal(e.message, 'SomeT must implement an Invalid function', 'missing');
  }

  // once we attach invalid, ensure it works
  attachInvalid();
  try { new SomeT(); }
  catch (e) {
    t.equal(e.message, 'Cannot construct SomeT: Need at least 2 players', 'inv');
  }

  // check verify score and unscorable
  var o = {
    progressCalled: function (match) {
      t.ok(true, "progress was called");
      t.deepEqual(match.m, [2,1], "match now has a score");
      t.equal(match.id.m, 1, "it was the first match");
    }
  };
  var inst = new SomeT(4, o);

  // score + unscorable
  t.ok(inst.matches.length, 'inst now set');
  t.equal(inst.unscorable(inst.matches[0].id, [2,1]), null, "verify allows");
  t.ok(inst.score(inst.matches[0].id, [2,1]), "could score");

  var reason = inst.unscorable(inst.matches[1].id, [2,1]);
  t.equal(reason, "Cannot score match 2", "verify rejects");
  t.ok(!inst.score(inst.matches[1].id, [2,1]), "and thus score returns false");


  // helpers
  // isPlayable does not check verify obviously
  t.ok(inst.isPlayable(inst.matches[0]), "can play first match");
  t.ok(inst.isPlayable(inst.matches[1]), "can play second match");
  t.equal(inst.findMatches({r:1}).length, 2, "both matches in r1");
  t.deepEqual(inst.players(), [1,2,3,4], "4 players in tournament");

  // results
  var res = inst.results();
  t.deepEqual(res, [
      { seed: 1, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 2, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 3, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 4, wins: 0, for: 0, against: 0, pos: 4 }
    ], "default results"
  );

  t.done();
};
