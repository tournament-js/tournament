var Challenge = require('./challenge')
  , Base = require(process.env.TOURNAMENT_COV ? '../lib-cov/tournament' : '../');

exports.inheritance = function (t) {
  var commonStatics = ['invalid', 'parse']
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
  var rawHelpers = ['sub', 'parse'];
  comparators.concat(rawHelpers).forEach(function (s) {
    t.equal(typeof Base[s], 'function', s + ' is a function');
  });
  t.equal(typeof Base.NONE, 'number', 'None exists on Base as a number');
  t.equal(Base.NONE, 0, "Tournament.NONE === 0");

  // methods
  var mainInterface = ['isDone', 'upcoming', 'unscorable', 'score', 'toString']
    , finders = ['findMatch', 'findMatches', 'findMatchesRanged']
    , splitters = ['rounds', 'sections', 'currentRound', 'nextRound']
    , trackers = ['matchesFor', 'players']
    , methods = mainInterface.concat(finders, splitters, trackers);
  var b = new Base([]); // will work, just doesn't do anything
  methods.forEach(function (m) {
    t.equal(typeof Base.prototype[m], 'function', m + ' is on Tournament.prototype');
    t.equal(typeof b[m], 'function', m + ' is on a base instance');
  });

  t.done();
};
