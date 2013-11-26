var test = require('tap').test
  , Duel = require('duel')
  , FFA = require('ffa')
  , GroupStage = require('groupstage')
  , Masters = require('masters');

var create = function (Klass, type) {
  if (type === 'Duel') {
    return new Klass(8, { last: Klass.LB, short: true });
  }
  if (type === 'FFA') {
    return new Klass(16, { sizes: [4,4,4], advancers: [2,2] });
  }
  if (type === 'Masters') {
    return new Klass(10, { knockouts: [2,4,2] });
  }
  if (type === 'GroupStage') {
    return new Klass(16, { groupSize: 4 });
  }
};

test("serialize/deserialize tournaments", function (t) {
  var trns = {
    Duel : Duel,
    FFA: FFA,
    Masters: Masters,
    GroupStage: GroupStage
  };
  Object.keys(trns).forEach(function (name) {
    var Klass = trns[name];
    var inst = create(Klass, name);
    t.ok(inst instanceof Klass, "inst is a " + Klass.name + " instance");
    inst.data = { hi: true };
    t.ok(inst.matches.length, 'some matches must have been made');
    inst.matches[0].data = { info: "arst" };

    var str = inst + '';
    var parsed = Klass.parse(str); // specific parse
    t.type(parsed, 'object', 'parsed str into an instance now');

    t.equal(parsed.data.hi, true, "saved a custom property on .data");
    t.equal(parsed.matches[0].data.info, "arst", "saved a custom property on .data");
    t.ok(parsed instanceof Klass, "parsed is a " + Klass.name + " instance");

    t.equal(str, parsed + '', "serialize the same way");
  });

  t.end();
});
