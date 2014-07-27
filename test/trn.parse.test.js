var Challenge = require('./challenge');

exports.serialize = function (t) {
  var inst = new Challenge(2);
  t.ok(inst instanceof Challenge, "inst is a " + Challenge.name + " instance");
  inst.data = { hi: true };
  t.ok(inst.matches.length, 'some matches must have been made');


  var str = inst.toString();
  var parsed = Challenge.parse(str); // specific parse
  t.equal(typeof parsed, 'object', 'parsed str into an instance now');

  t.equal(parsed.data.hi, true, "saved a custom property on .data");
  t.ok(parsed instanceof Challenge, "parsed is a " + Challenge.name + " instance");

  t.equal(str, parsed + '', "serialize the same way");

  t.done();
};
