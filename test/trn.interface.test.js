var tap = require('tap')
  , test = tap.test
  , Base = require('../'); // main interface

// individual class entry proints
var mains = {
  Masters : require('masters'),
  FFA : require('ffa'),
  GroupStage : require('groupstage'),
  Duel : require('duel')
};

// NB: publics used to be ['WO', 'NA', 'WB', 'LB']
var publics = []
  , commonStatics = ['invalid', 'idString', 'parse']
  , commonMethods = ['score', 'unscorable', 'upcoming', 'results', 'isDone']
  , baseMethods = ['findMatch', 'findMatches', 'rounds']
  , commonMembers = ['matches', 'numPlayers'];

// TODO: test TieBreaker
var makeInstance = function (C) {
  switch (C.name) {
  case 'Duel':
    return new C(4, 1);
  case 'FFA':
    return new C(4, [4], []);
  case 'Masters':
    return new C(5, [2]);
  case 'GroupStage':
    return new C(8, 4);
  default:
    throw new Error("invalid class: " + C.name);
  }
};

var classHasCommons = function (C, t) {
  commonStatics.forEach(function (s) {
    t.ok(C[s], s + " static exists on " + C.name);
    t.type(C[s], 'function', s + ' static is a function on ' + C.name);
  });

  commonMethods.forEach(function (m) {
    t.ok(C.prototype[m], m + " method exists on " + C.name);
    t.type(C.prototype[m], 'function', m + ' method is a function on ' + C.name);
  });

  var inst = makeInstance(C);
  commonMembers.concat(baseMethods).forEach(function (m) {
    t.ok(inst[m] !== undefined, m + " member exists on inst of " + C.name);
    t.ok(inst[m] !== 'function', m + ' is a non-function on inst of ' + C.name);
  });
};

var hasPublics = function (obj, t) {
  publics.forEach(function (p) {
    t.ok(obj[p] !== undefined, p + " prop exists on " + obj.name);
  });
};


test("interfaces", function (t) {
  ['Duel', 'FFA', 'GroupStage', 'Masters'].forEach(function (type) {
    // both main and individual entry points should have commons
    classHasCommons(mains[type], t);
    // if we required individual entry point, then publics exist directly on that
    hasPublics(mains[type], t);
  });
  t.end();
});
