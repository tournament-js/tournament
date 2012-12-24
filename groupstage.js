var GroupStage = require('./lib/groupstage.js');
var helpers = require('./lib/public');
Object.keys(helpers).forEach(function (key) {
  GroupStage[key] = helpers[key];
});

module.exports = GroupStage;

