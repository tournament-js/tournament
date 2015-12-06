var Base = require('../')
  , test = require('bandage');

var SomeT = Base.sub('SomeT', function (opts, initParent) {
  this.opts = opts;
  var ms = [
    { id: { s: 1, r: 1, m: 1 }, p: [1,2] },
    { id: { s: 1, r: 1, m: 2 }, p: [3,4] },
  ];
  initParent(ms);
});
SomeT.prototype._verify = function (match) {
  if (match.id.m === 2) {
    return 'Cannot score match 2'; // for the lulz
  }
  return null;
};

SomeT.prototype._progress = function (match) {
  this.opts.progressCalled(match);
};
SomeT.defaults = function (np, opts) {
  // NB: this is a hacky implementation not using .configure - so preserve opts
  var o = opts || {};
  o.log = { error: function () {} }; // ignore logs
  o.progressCalled = o.progressCalled || function () {};
  return o;
};

test('sub', function *(t) {
  // ensure we have to implement invalid
  var ctorCheck = function *() {
    return new SomeT(1);
  };
  yield t.throws(ctorCheck, /SomeT must implement an Invalid/, 'invalid fn missing');

  // attach invalid fn manually
  SomeT.invalid = function (numPlayers) {
    if (!Base.isInteger(numPlayers) || numPlayers < 2) {
      return 'Need at least 2 players';
    }
    return null;
  };
  yield t.throws(ctorCheck, /SomeT: Need at least 2 pl/, 'invalid rejected construct');

  // check verify score and unscorable
  var o = {
    progressCalled: function (match) {
      t.ok(true, 'progress was called');
      t.eq(match.m, [2,1], 'match now has a score');
      t.eq(match.id.m, 1, 'it was the first match');
    }
  };
  var inst = new SomeT(4, o);

  // score + unscorable
  t.ok(inst.matches.length, 'inst now set');
  t.eq(inst.unscorable(inst.matches[0].id, [2,1]), null, 'verify allows');
  t.ok(inst.score(inst.matches[0].id, [2,1]), 'could score');

  var reason = inst.unscorable(inst.matches[1].id, [2,1]);
  t.eq(reason, 'Cannot score match 2', 'verify rejects');
  t.ok(!inst.score(inst.matches[1].id, [2,1]), 'and thus score returns false');


  // helpers
  // isPlayable does not check verify obviously
  t.ok(inst.isPlayable(inst.matches[0]), 'can play first match');
  t.ok(inst.isPlayable(inst.matches[1]), 'can play second match');
  t.eq(inst.findMatches({r:1}).length, 2, 'both matches in r1');
  t.eq(inst.players(), [1,2,3,4], '4 players in tournament');

  // results
  var res = inst.results();
  t.eq(res, [
      { seed: 1, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 2, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 3, wins: 0, for: 0, against: 0, pos: 4 },
      { seed: 4, wins: 0, for: 0, against: 0, pos: 4 }
    ], 'default results'
  );
});
