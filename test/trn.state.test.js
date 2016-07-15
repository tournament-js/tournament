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

test('serialize with data', function *(t) {
  var inst = new Challenge(2, {});
  t.instance(inst, Challenge, 'inst is a ' + Challenge.name + ' instance');
  t.ok(inst.matches.length, 'some matches must have been made');
  inst.matches.forEach(function (m) {
    inst.score(m.id, [1,0]);
    m.data = { my: 'customObject' };
  });
  // match data should be preserved if passed to restore
  var copy = Challenge.restore(2, {}, inst.state, inst.metadata());
  t.eq(copy.matches, inst.matches, 'recreated matches with data');
  t.eq(copy.state, inst.state, 'state reassembled itself');
  t.eq(copy.matches[0].data.my, 'customObject'); // sanity

  // and it should fail if not passed in
  var copy2 = Challenge.restore(2, {}, inst.state);
  t.neq(copy2.matches, inst.matches, 'recreated no longer matches original');
});
