var test = require('tap').test
  , EntryDuel = require('../duel')
  , EntryFFA = require('../ffa')
  , EntryGroupStage = require('../groupstage')
  , EntryKnockOut = require('../knockout')
  , T = require('../');


var create = function (type) {
  if (type === 'Duel') {
    return new T.Duel(8, T.LB, {short: true});
  }
  if (type === 'FFA') {
    return new T.FFA(16, [4,4,4], [2,2]);
  }
  if (type === 'KnockOut') {
    return new T.KnockOut(10, [2,4,2]);
  }
  if (type === 'GroupStage') {
    return new T.GroupStage(16, 4);
  }
  if (type === 'TieBreaker') {
    var gs = new T.GroupStage(16, 4);
    gs.matches.forEach(function (m) {
      gs.score(m.id, [1,0]);
    });
    return new T.TieBreaker(gs.results(), 3);
  }
};

test("serialize/deserialize tournaments", function (t) {
  [T.Duel, T.FFA, T.KnockOut, T.GroupStage, T.TieBreaker].forEach(function (Klass) {
    var inst = create(Klass.name);
    t.ok(inst instanceof T.Base, "inst is a Base class instance");
    t.ok(inst instanceof Klass, "inst is a " + Klass.name + " instance");

    var str = inst + '';
    var parsed = T.parse(str); // general parse

    t.ok(parsed instanceof T.Base, "parsed is a Base class instance");
    t.ok(parsed instanceof Klass, "parsed is a " + Klass.name + " instance");

    t.equal(str, parsed + '', "serialize the same way");
  });

  // now parse directly on specific entry points
  // NB: no separate entry for tiebreaker yet as this makes no sense
  [EntryDuel, EntryFFA, EntryKnockOut, EntryGroupStage].forEach(function (Klass) {
    var inst = create(Klass.name);
    t.ok(inst instanceof Klass, "inst is a " + Klass.name + " instance");

    var str = inst + '';
    var parsed = Klass.parse(str); // specific parse

    t.ok(parsed instanceof Klass, "parsed is a " + Klass.name + " instance");

    t.equal(str, parsed + '', "serialize the same way");

    // even though we don't normally have access to Base, can check instanceof here
    t.ok(inst instanceof T.Base, "inst is a Base class instance");
    t.ok(parsed instanceof T.Base, "parsed is a Base class instance");
  });

  t.end();
});
