var Challenge = require('./challenge')
  , test = require('bandage');

test('serialize', function *(t) {
  var inst = new Challenge(2, {});
  t.instance(inst, Challenge, 'inst is a ' + Challenge.name + ' instance');
  t.ok(inst.matches.length, 'some matches must have been made');
  inst.matches.forEach(function (m) {
    inst.score(m.id, [1,0]);
  });

  var copy = Challenge.restore(2, {}, inst.state);
  t.eq(copy.matches, inst.matches, 'recreated matches');
  t.eq(copy.state, inst.state, 'state reassembled itself');
});
