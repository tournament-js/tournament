var Challenge = require('./challenge')
  , Tournament = require(process.env.TOURNAMENT_COV ? '../tournament-cov' : '../');

exports.inheritance = function (t) {
  var commonStatics = ['invalid', 'idString', 'parse']
    //, commonMethods = ['progress', 'verify', 'early', 'limbo', 'results']
    , commonMethods = ['results']
    , baseMethods = ['findMatch', 'findMatches', 'rounds']
    , commonMembers = ['matches', 'numPlayers'];


  var C = Challenge;
  commonStatics.forEach(function (s) {
    t.ok(C[s], s + " static exists");
    t.equal(typeof C[s], 'function', s + ' static is indeed a function type');
  });

  commonMethods.forEach(function (m) {
    t.ok(C.prototype[m], m + " method exists");
    t.equal(typeof C.prototype[m], 'function', m + ' method is indeed a function');
  });

  var inst = new Challenge(2);
  commonMembers.concat(baseMethods).forEach(function (m) {
    t.ok(inst[m], m + ' exists on instance');
  });
  commonMethods.forEach(function (m) {
    if (inst[m]) { // doesn't have to be implemented
      t.equal(typeof inst[m], 'function', m + ' exists on instance');
    }
  });
  t.done();
};

exports.interface = function (t) {
  // statics
  var comparators = ['compareMatches', 'compareRes', 'compareZip', 'sorted'];
  var rawHelpers = ['sub', 'idString', 'parse'];
  comparators.concat(rawHelpers).forEach(function (s) {
    t.equal(typeof Tournament[s], 'function', s + ' is a function');
  });
  t.equal(typeof Tournament.NONE, 'number', 'None exists on Tournament as a number');
  t.equal(Tournament.NONE, 0, "Tournament.NONE === 0");

  // methods
  var mainInterface = ['isDone', 'upcoming', 'unscorable', 'score', 'toString']
    , finders = ['findMatch', 'findMatches', 'findMatchesRanged']
    , splitters = ['rounds', 'sections', 'currentRound', 'nextRound']
    , trackers = ['matchesFor', 'players']
    , methods = mainInterface.concat(finders, splitters, trackers);
  var b = new Tournament([]); // will work, just doesn't do anything
  methods.forEach(function (m) {
    t.equal(typeof Tournament.prototype[m], 'function', m + ' is on Tournament.prototype');
    t.equal(typeof b[m], 'function', m + ' is on a base instance');
  });

  t.done();
};
