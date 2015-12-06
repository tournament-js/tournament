var Challenge = require('./challenge')
  , Base = require('../')
  , test = require('bandage');

var inheritableStatics = [
  'configure',
  'defaults',
  'invalid',
  'inherit',
  'sub',
  'from'
];
// restore is only on subclass
var subStatics = inheritableStatics.concat('restore');
var baseStatics = [
  'compareMatches',
  'compareRes',
  'compareZip',
  'isInteger',
  'sorted',
  'resTieCompute',
  'resultEntry',
  'matchTieCompute'
].concat(inheritableStatics);

var methods = [
  'isDone',
  'unscorable',
  'score',
  'results',
  'resultsFor',
  'upcoming',
  'isPlayable',
  'findMatch',
  'findMatches',
  'findMatchesRanged',
  'rounds',
  'sections',
  'currentRound',
  'nextRound',
  'matchesFor',
  'players'
];

var properties = ['matches', 'numPlayers'];

var virtuals = ['_verify', '_progress', '_early', '_safe', '_initResult'];

test('inheritance', function *(t) {
  var C = Challenge;
  subStatics.forEach(function (s) {
    t.type(C[s], 'function', s + ' static on subclass');
  });

  var inst = new Challenge(2);
  properties.forEach(function (m) {
    t.ok(inst[m], m + ' exists on instance');
  });
  methods.concat(virtuals).forEach(function (m) {
    t.type(inst[m], 'function', m + ' method on instance');
    t.type(C.prototype[m], 'function', m + ' methods on prototype');
  });
});

test('interface', function *(t) {
  baseStatics.forEach(function (s) {
    t.type(Base[s], 'function', s + ' is a function');
  });
  t.type(Base.NONE, 'number', 'None exists on Base as a number');
  t.eq(Base.NONE, 0, 'Tournament.NONE is 0');
  t.eq(baseStatics.concat('NONE').sort(), Object.keys(Base).sort(),
    'expected properties on base'
  );

  var b = new Base([]); // will work, just doesn't do anything
  methods.forEach(function (m) {
    t.type(Base.prototype[m], 'function', m + ' is on Tournament.prototype');
    t.type(b[m], 'function', m + ' is on a base instance');
  });
  // verify that we have all expected methods
  t.eq(methods, Object.keys(Base.prototype), 'expected prototype methods on base');
});
