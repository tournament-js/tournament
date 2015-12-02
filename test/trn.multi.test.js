var $ = require('interlude')
  , Challenge = require('./challenge')
  , test = require('bandage');

// verify that .from works on the example implementation
test('ChallengeToChallenge', function *(t) {
  var c1 = new Challenge(16);
  c1.matches.forEach(function (m) {
    c1.score(m.id, [1,0]);
  });

  var top8 = $.pluck('seed', c1.results().slice(0, 8));
  t.deepEqual(top8, [1,3,5,7,9,11,13,15], "winners are odd seeds");

  var c2 = Challenge.from(c1, 8);
  t.equal(c2.matches.length, 4, "4 matches c2");
  t.deepEqual(c2.players(), [1,3,5,7,9,11,13,15], "advancers from c1");
  t.deepEqual(c2.matches[0].p, [1,3], "1 and 2 in c2 m1");
  t.deepEqual(c2.matches[1].p, [5,7], "3 and 4 in c2 m2");
  t.deepEqual(c2.matches[2].p, [9,11], "5 and 6 in c2 m3");
  t.deepEqual(c2.matches[3].p, [13,15], "7 and 8 in c2 m4");
  c2.matches.forEach(function (m) {
    c2.score(m.id, [0,1]); // reverse seed order
  });
  var top4 = $.pluck('seed', c2.results().slice(0, 4));
  t.deepEqual(top4, [3,7,11,15], "winners top 4 seeds in c2");

  var c3 = Challenge.from(c2, 4);
  t.deepEqual(c3.players(), [3,7,11,15], "top 4 progressed to c3");
});
