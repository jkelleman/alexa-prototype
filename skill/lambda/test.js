const assert = require('assert');
const { handler } = require('./index');

const base = (request) => ({
  version: '1.0',
  session: { new: true, sessionId: 's', application: { applicationId: 'a' }, user: { userId: 'u' }, attributes: {} },
  context: { System: { application: { applicationId: 'a' }, user: { userId: 'u' }, device: { deviceId: 'd', supportedInterfaces: {} } } },
  request: { requestId: 'r', timestamp: new Date().toISOString(), locale: 'en-US', ...request },
});
const intent = (name, slots = {}) => base({ type: 'IntentRequest', intent: { name, slots, confirmationStatus: 'NONE' } });
const run = (ev) => new Promise((res, rej) => handler(ev, {}, (e, r) => (e ? rej(e) : res(r))));

(async () => {
  let r = await run(base({ type: 'LaunchRequest' }));
  assert(r.response.outputSpeech.ssml.includes('What should I call you'));

  r = await run(intent('NameIntent', { name: { name: 'name', value: 'Sam', confirmationStatus: 'NONE' } }));
  assert(r.response.outputSpeech.ssml.includes('Sam'));

  r = await run(intent('InterestIntent', { interest: { name: 'interest', value: 'music', confirmationStatus: 'NONE' } }));
  assert.strictEqual(r.response.shouldEndSession, true);

  r = await run(intent('NameIntent'));
  assert(r.response.reprompt);
  console.log('all passed');
})().catch((e) => { console.error(e); process.exit(1); });
