var test = require('tap').test
  , Duel = require('duel')
  , FFA = require('ffa')
  , GroupStage = require('groupstage')
  , Masters = require('masters')
  //, TieBreaker = require('../lib/tiebreak_groups')
  , Base = require('../');


var create = function (Klass) {
  var type = Klass.name;
  if (type === 'Duel') {
    return new Klass(8, Klass.LB, {short: true});
  }
  if (type === 'FFA') {
    return new Klass(16, [4,4,4], [2,2]);
  }
  if (type === 'Masters') {
    return new Klass(10, [2,4,2]);
  }
  if (type === 'GroupStage') {
    return new Klass(16, 4);
  }
  //if (type === 'TieBreaker') {
  //  var gs = new GroupStage(16, 4);
  //  gs.matches.forEach(function (m) {
  //    gs.score(m.id, [1,0]);
  //  });
  //  return new Klass(gs.results(), 3);
  //}
};

test("serialize/deserialize tournaments", function (t) {
  [Duel, FFA, Masters, GroupStage].forEach(function (Klass) {
    var inst = create(Klass);
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

    // even though we don't normally have access to Base, can check instanceof here
    t.ok(inst instanceof Base, "inst is a Base class instance");
    t.ok(parsed instanceof Base, "parsed is a Base class instance");
  });

  t.end();
});
