var Tournament = require('../');

var Challenge = Tournament.sub('Challenge', function (opts, initParent) {
  var match = { id: { s: 1, r: 1, m: 1}, p: [1, 2] };
  initParent([match]);
});

Challenge.configure({
  invalid: function (np) {
    if (np !== 2) {
      return "Challenge can only have two players";
    }
    return null;
  }
});

Challenge.prototype._stats = function (res, m) {
  if (m.m && m.m[0] !== m.m[1]) {
    var w = (m.m[0] > m.m[1]) ? m.p[0] : m.p[1];
    Tournament.resultEntry(res, w).pos -= 1; // winner === winner of match
  }
  return res;
};

module.exports = Challenge;
