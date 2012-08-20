var T = {}
  , eql = require('deep-equal');

const WB = 1, LB = 2, WO = -1, NA = 0;
T.WB = WB;
T.LB = LB;
T.WO = WO;
T.NA = NA;


// only need to check if a game has the given id, not complete equality
T.byId = function (id, g) {
  return eql(id, g.id);
};

// sorting is chronological, and as you normally read it: WB R2 G3
// => first bracket, then round, then game.
T.compareGames = function (g1, g2) {
  return (g1.id.b - g2.id.b) || (g1.id.r - g2.id.r) || (g1.id.g - g2.id.g);
};

T.representation = function (id) {
  var rep = "";
  if (id.b === WB) {
    rep = "WB ";
  }
  else if (id.b === LB) {
    rep = "LB ";
  }
  // else assume no bracket identifier wanted
  return rep += "R" + id.r + " G" + id.g;
};

module.exports = T;
