var Base = require('../');

var Challenge = Base.sub('Challenge', function (opts, initParent) {
  var ms = [];
  for (var i = 0; i < this.numPlayers/2; i += 1) {
    ms.push({ id: { s: 1, r: 1, m: i+1}, p: [2*i+1, 2*i+2] });
  }
  initParent(ms);
});

Challenge.configure({
  invalid: function (np) {
    if (np % 2 !== 0) {
      return 'Challenge can only have a multiple of two players';
    }
    return null;
  }
});

Challenge.prototype._stats = function (res, m) {
  if (m.m && m.m[0] !== m.m[1]) {
    var w = (m.m[0] > m.m[1]) ? m.p[0] : m.p[1];
    var l = (m.m[0] > m.m[1]) ? m.p[1] : m.p[0];
    Base.resultEntry(res, w).pos = 1;
    Base.resultEntry(res, l).pos = this.numPlayers/2 + 1;
  }
  return res;
};

module.exports = Challenge;
