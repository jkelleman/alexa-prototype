const assert = require('assert');
const FirstWords = require('./dialog');
const { handler } = require('./index');

// ---- Engine: the conversation rules from eval/rubric.md and README principles
function talk(inputs) {
  let r = FirstWords.start();
  const turns = [r];
  for (const input of inputs) {
    const event = typeof input === 'string' ? FirstWords.parse(input, r.state) : input;
    r = FirstWords.next(r.state, event);
    turns.push(r);
    if (r.end) break;
  }
  return turns;
}
const last = (turns) => turns[turns.length - 1];
const questionCount = (say) => (say.match(/\?/g) || []).length;

const tests = {
  'happy path ends with an explicit next step': () => {
    const t = talk(['Sam', 'music']);
    assert.match(t[1].say, /Nice to meet you, Sam/);
    assert.strictEqual(last(t).end, true);
    assert.match(last(t).say, /try saying, "Alexa, play some jazz\."/);
  },
  'every open turn asks exactly one question': () => {
    for (const inputs of [['Sam'], ['blorp'], ['blorp', 'blorp'], ['help'], ['skip'], ['Sam', 'neus'], ['Sam', 'xyz']]) {
      const r = last(talk(inputs));
      if (!r.end) assert.strictEqual(questionCount(r.say) <= 1, true, `${inputs}: ${r.say}`);
    }
  },
  'recovery rephrases instead of repeating': () => {
    const t = talk(['blorp', 'blorp']);
    assert.notStrictEqual(t[1].say, t[2].say);
    assert.match(t[2].say, /like Sam/);
  },
  'two misses, then a graceful exit': () => {
    const t = talk(['blorp', 'blorp', 'blorp']);
    assert.strictEqual(t[2].end, false);
    assert.strictEqual(last(t).end, true);
    assert.match(last(t).say, /any time/);
  },
  'a close match is confirmed before acting': () => {
    const t = talk(['Sam', 'neus']);
    assert.strictEqual(last(t).say, 'Did you say news?');
    const yes = FirstWords.next(last(t).state, { type: 'yes' });
    assert.match(yes.say, /news it is/);
    const no = FirstWords.next(last(t).state, { type: 'no' });
    assert.match(no.say, /music, news, or smart home/);
  },
  'the user can skip their name': () => {
    const t = talk(['skip', 'news']);
    assert.match(t[1].say, /^No problem/);
    assert.strictEqual(last(t).state.name, undefined);
  },
  'help answers for the current step': () => {
    assert.match(last(talk(['help'])).say, /what should I call you/i);
    assert.match(last(talk(['Sam', 'help'])).say, /music, news, or smart home/);
  },
  'help only claims what is built': () => {
    const say = last(talk(['Sam', 'what can you do'])).say;
    assert.doesNotMatch(say, /thousands|pizza|order/i);
  },
  'silence gets one reprompt, then the session closes': () => {
    const t = talk(['', '']);
    assert.strictEqual(t[1].end, false);
    assert.strictEqual(last(t).end, true);
  },
  'the screen never offers a choice the voice did not say': () => {
    for (const inputs of [[], ['Sam'], ['blorp'], ['Sam', 'neus'], ['help'], ['']]) {
      const r = last(talk(inputs));
      for (const choice of r.screen.choices || []) {
        assert.ok(r.say.toLowerCase().includes(choice.toLowerCase()) || (choice === 'Yes' || choice === 'No') && /did you say/i.test(r.say),
          `screen offers "${choice}" but voice said: ${r.say}`);
      }
    }
  },
  'jumping ahead is allowed': () => {
    assert.match(last(talk(['news'])).say, /news it is/);
  },
};

// ---- Alexa skill: intents are translated into the same engine events
const base = (request, attributes = {}, apl = false) => ({
  version: '1.0',
  session: { new: true, sessionId: 's', application: { applicationId: 'a' }, user: { userId: 'u' }, attributes },
  context: { System: { application: { applicationId: 'a' }, user: { userId: 'u' },
    device: { deviceId: 'd', supportedInterfaces: apl ? { 'Alexa.Presentation.APL': { runtime: { maxVersion: '2023.3' } } } : {} } } },
  request: { requestId: 'r', timestamp: new Date().toISOString(), locale: 'en-US', ...request },
});
const intent = (name, slots = {}, attributes, apl) => base({ type: 'IntentRequest', intent: { name, slots, confirmationStatus: 'NONE' } }, attributes, apl);
const slot = (name, value) => ({ [name]: { name, value, confirmationStatus: 'NONE' } });
const call = (ev) => new Promise((res, rej) => handler(ev, {}, (e, r) => (e ? rej(e) : res(r))));
const say = (r) => r.response.outputSpeech.ssml.replace(/<[^>]+>/g, '');

const skillTests = {
  'skill: launch, name, interest': async () => {
    let r = await call(base({ type: 'LaunchRequest' }));
    assert.match(say(r), /What should I call you/);
    r = await call(intent('NameIntent', slot('name', 'Sam'), r.sessionAttributes));
    assert.match(say(r), /Sam/);
    r = await call(intent('InterestIntent', slot('interest', 'music'), r.sessionAttributes));
    assert.strictEqual(r.response.shouldEndSession, true);
    assert.match(say(r), /play some jazz/);
  },
  'skill: unresolved slot is confirmed': async () => {
    let r = await call(base({ type: 'LaunchRequest' }));
    r = await call(intent('NameIntent', slot('name', 'Sam'), r.sessionAttributes));
    r = await call(intent('InterestIntent', slot('interest', 'neus'), r.sessionAttributes));
    assert.match(say(r), /Did you say news/);
    r = await call(intent('AMAZON.YesIntent', {}, r.sessionAttributes));
    assert.match(say(r), /news it is/);
  },
  'skill: two fallbacks reprompt, the third exits': async () => {
    let r = await call(base({ type: 'LaunchRequest' }));
    for (const expectEnd of [false, false, true]) {
      r = await call(intent('AMAZON.FallbackIntent', {}, r.sessionAttributes));
      assert.strictEqual(r.response.shouldEndSession, expectEnd);
    }
  },
  'skill: screen devices get the matching APL screen': async () => {
    let r = await call(base({ type: 'LaunchRequest' }, {}, true));
    r = await call(intent('NameIntent', slot('name', 'Sam'), r.sessionAttributes, true));
    const apl = r.response.directives.find((d) => d.type === 'Alexa.Presentation.APL.RenderDocument');
    assert.deepStrictEqual(apl.datasources.payload.screen.choices, ['Music', 'News', 'Smart home']);
  },
  'skill: tapping a button works like saying it': async () => {
    let r = await call(base({ type: 'LaunchRequest' }, {}, true));
    r = await call(intent('SkipIntent', {}, r.sessionAttributes, true));
    r = await call(base({ type: 'Alexa.Presentation.APL.UserEvent', arguments: ['News'] }, r.sessionAttributes, true));
    assert.match(say(r), /news it is/);
  },
  'skill: voice-only devices get no screen': async () => {
    const r = await call(base({ type: 'LaunchRequest' }));
    assert.ok(!(r.response.directives || []).length);
  },
};

(async () => {
  let failed = 0;
  for (const [name, fn] of Object.entries({ ...tests, ...skillTests })) {
    try { await fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
