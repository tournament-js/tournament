var GroupStage = require('./lib/groupstage.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  if(key === "prototype") {
    Object.keys(helpers.prototype).forEach(function (key) {
      GroupStage.prototype[key] = helpers.prototype[key];
    });
  } else {
    GroupStage[key] = helpers[key];
  }
});

module.exports = GroupStage;

