var tap = require('tap')
  , test = tap.test
  , T = require('../')
  , KnockOut = require('../knockout')
  , FFA = require('../ffa')
  , GroupStage = require('../groupstage')
  , Duel = require('../duel');

var publics = ['WO', 'NA', 'WB', 'LB', 'TB', 'findMatch']
  , commonStatics = ['invalid', 'idString', 'fromJSON']
  , commonMethods = ['score', 'unscorable', 'upcoming', 'results', 'isDone']
  , commonMembers = ['matches', 'numPlayers'];

var makeInstance = function (C, t) {
  switch (C.name) {
    case 'Duel':        return new C(4, 1);
    case 'FFA':         return new C(4, [4], []);
    case 'KnockOut':    return new C(5, [2]);
    case 'GroupStage':  return new C(8, 4);
    default: t.ok(false, "invalid class: " + C.name);
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

  var inst = makeInstance(C, t);
  commonMembers.forEach(function (m) {
    t.ok(inst[m] !== undefined, m + " member exists on inst of " + C.name);
    t.ok(inst[m] !== 'function', m + ' is a non-function on inst of ' + C.name);
  });
};

test("main interface", function (t) {
  publics.forEach(function (p) {
    t.ok(T[p] !== undefined, p + " prop on t exists");
  });
  classHasCommons(T.KnockOut, t);
  classHasCommons(T.FFA, t);
  classHasCommons(T.Duel, t);
  classHasCommons(T.GroupStage, t);
  t.end();
});

test("ko interface", function (t) {
  publics.forEach(function (p) {
    t.ok(KnockOut[p] !== undefined, p + " prop on KnockOut exists");
  });
  classHasCommons(KnockOut, t);
  t.end();
});

test("ffa interface", function (t) {
  publics.forEach(function (p) {
    t.ok(FFA[p] !== undefined, p + " prop on FFA exists");
  });
  classHasCommons(FFA, t);
  t.end();
});

test("duel interface", function (t) {
  publics.forEach(function (p) {
    t.ok(Duel[p] !== undefined, p + " prop on Duel exists");
  });
  classHasCommons(Duel, t);
  t.end();
});

test("groupstage interface", function (t) {
  publics.forEach(function (p) {
    t.ok(GroupStage[p] !== undefined, p + " prop on GroupStage exists");
  });
  classHasCommons(GroupStage, t);
  t.end();
});
