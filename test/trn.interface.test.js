var tap = require('tap')
  , test = tap.test
  , Tournament = require('../'); // main interface

// individual class entry proints
var mains = {
  Masters : require('masters'),
  FFA : require('ffa'),
  GroupStage : require('groupstage'),
  Duel : require('duel')
};

// TODO: test TieBreaker
var makeInstance = function (name) {
  switch (name) {
  case 'Duel':
    return new mains.Duel(4);
  case 'FFA':
    return new mains.FFA(4);
  case 'Masters':
    return new mains.Masters(5);
  case 'GroupStage':
    return new mains.GroupStage(8);
  default:
    throw new Error("invalid class: " + name);
  }
};

test("interfaces", function (t) {
  var commonStatics = ['invalid', 'idString', 'parse']
    //, commonMethods = ['progress', 'verify', 'early', 'limbo', 'results']
    , commonMethods = ['results']
    , baseMethods = ['findMatch', 'findMatches', 'rounds']
    , commonMembers = ['matches', 'numPlayers'];

  ['Duel', 'FFA', 'GroupStage', 'Masters'].forEach(function (type) {
    var C = mains[type];
    commonStatics.forEach(function (s) {
      t.ok(C[s], s + " static exists on " + type);
      t.type(C[s], 'function', s + ' static is a function on ' + type);
    });

    commonMethods.forEach(function (m) {
      t.ok(C.prototype[m], m + " method exists on " + type);
      t.type(C.prototype[m], 'function', m + ' method is a function on ' + type);
    });

    var inst = makeInstance(type);
    commonMembers.concat(baseMethods).forEach(function (m) {
      t.ok(inst[m], m + ' exists on ' + type + ' instance');
    });
    commonMethods.forEach(function (m) {
      if (inst[m]) { // doesn't have to be implemented
        t.type(inst[m], 'function', m + ' exists on ' + type + ' instance');
      }
    });
  });
  t.end();
});

test("base interface", function (t) {
  // statics
  var comparators = ['compareMatches', 'compareRes', 'compareZip', 'sorted'];
  var rawHelpers = ['sub', 'idString', 'parse'];
  comparators.concat(rawHelpers).forEach(function (s) {
    t.type(Tournament[s], 'function');

  });
  t.type(Tournament.NONE, 'number', 'None exists on Tournament as a number');
  t.equal(Tournament.NONE, 0, "Tournament.NONE === 0");

  // methods
  var mainInterface = ['isDone', 'upcoming', 'unscorable', 'score', 'toString']
    , finders = ['findMatch', 'findMatches', 'findMatchesRanged']
    , splitters = ['rounds', 'sections', 'currentRound', 'nextRound']
    , trackers = ['matchesFor', 'players']
    , methods = mainInterface.concat(finders, splitters, trackers);
  var b = new Tournament([]); // will work, just doesn't do anything
  methods.forEach(function (m) {
    t.type(Tournament.prototype[m], 'function', m + ' is on Tournament.prototype');
    t.type(b[m], 'function', m + ' is on a base instance');
  });

  t.end();
});
