var test = require('tap').test
  , EntryDuel = require('../duel')
  , EntryFFA = require('../ffa')
  , EntryGroupStage = require('../groupstage')
  , EntryKnockOut = require('../knockout')
  , T = require('../');


var create = function (Klass) {
  var type = Klass.name;
  if (type === 'Duel') {
    return new Klass(8, T.LB, {short: true});
  }
  if (type === 'FFA') {
    return new Klass(16, [4,4,4], [2,2]);
  }
  if (type === 'KnockOut') {
    return new Klass(10, [2,4,2]);
  }
  if (type === 'GroupStage') {
    return new Klass(16, 4);
  }
  if (type === 'TieBreaker') {
    var gs = new T.GroupStage(16, 4);
    gs.matches.forEach(function (m) {
      gs.score(m.id, [1,0]);
    });
    return new Klass(gs.results(), 3);
  }
};

test("serialize/deserialize tournaments", function (t) {
  [T.Duel, T.FFA, T.KnockOut, T.GroupStage, T.TieBreaker].forEach(function (Klass) {
    var inst = create(Klass);
    t.ok(inst instanceof T.Base, "inst is a Base class instance");
    t.ok(inst instanceof Klass, "inst is a " + Klass.name + " instance");
    inst.data = { hi: true };
    inst.matches[0].data = { info: "arst" };

    var str = inst + '';
    var parsed = T.parse(str); // general parse

    t.equal(parsed.data.hi, true, "saved a custom property on .data");
    t.equal(parsed.matches[0].data.info, "arst", "saved a custom property on .data");
    t.ok(parsed instanceof T.Base, "parsed is a Base class instance");
    t.ok(parsed instanceof Klass, "parsed is a " + Klass.name + " instance");

    t.equal(str, parsed + '', "serialize the same way");
  });

  // now parse directly on specific entry points
  // NB: no separate entry for tiebreaker yet as this makes no sense
  [EntryDuel, EntryFFA, EntryKnockOut, EntryGroupStage].forEach(function (Klass) {
    var inst = create(Klass);
    t.ok(inst instanceof Klass, "inst is a " + Klass.name + " instance");
    inst.data = { hi: true };
    inst.matches[0].data = { info: "arst" };

    var str = inst + '';
    var parsed = Klass.parse(str); // specific parse

    t.equal(parsed.data.hi, true, "saved a custom property on .data");
    t.equal(parsed.matches[0].data.info, "arst", "saved a custom property on .data");
    t.ok(parsed instanceof Klass, "parsed is a " + Klass.name + " instance");

    t.equal(str, parsed + '', "serialize the same way");

    // even though we don't normally have access to Base, can check instanceof here
    t.ok(inst instanceof T.Base, "inst is a Base class instance");
    t.ok(parsed instanceof T.Base, "parsed is a Base class instance");
  });

  t.end();
});
