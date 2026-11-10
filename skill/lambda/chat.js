// Local harness: simulates utterances against the skill handler and prints a transcript.
// Usage: node chat.js            (runs built-in scenarios)
const { handler } = require('./index');

const INTERESTS = ['music', 'news', 'smart home'];
const NAMES = ['sam', 'alex', 'jo', 'priya']; // stand-in for AMAZON.FirstName

function toRequest(utterance) {
  if (utterance === null) return { type: 'LaunchRequest' };
  const u = utterance.trim().toLowerCase();
  const interest = INTERESTS.find((i) => u === i || u.includes(i));
  if (interest) {
    return { type: 'IntentRequest', intent: { name: 'InterestIntent', confirmationStatus: 'NONE',
      slots: { interest: { name: 'interest', value: interest, confirmationStatus: 'NONE' } } } };
  }
  const m = u.match(/^(?:my name is |call me )?([a-z]+)$/);
  if (m && NAMES.includes(m[1])) {
    const name = m[1][0].toUpperCase() + m[1].slice(1);
    return { type: 'IntentRequest', intent: { name: 'NameIntent', confirmationStatus: 'NONE',
      slots: { name: { name: 'name', value: name, confirmationStatus: 'NONE' } } } };
  }
  if (u === 'help' || u === 'what can you do') return { type: 'IntentRequest', intent: { name: 'AMAZON.HelpIntent', confirmationStatus: 'NONE' } };
  if (u === 'stop') return { type: 'IntentRequest', intent: { name: 'AMAZON.StopIntent', confirmationStatus: 'NONE' } };
  return { type: 'IntentRequest', intent: { name: 'AMAZON.FallbackIntent', confirmationStatus: 'NONE' } };
}

const call = (event) => new Promise((res, rej) => handler(event, {}, (e, r) => (e ? rej(e) : res(r))));
const strip = (ssml) => ssml.replace(/<[^>]+>/g, '');

async function scenario(title, utterances) {
  console.log(`## ${title}\n`);
  let attributes = {};
  for (const utterance of [null, ...utterances]) {
    if (utterance !== null) console.log(`> U: ${utterance}  `);
    const res = await call({
      version: '1.0',
      session: { new: utterance === null, sessionId: 's', application: { applicationId: 'a' }, user: { userId: 'u' }, attributes },
      context: { System: { application: { applicationId: 'a' }, user: { userId: 'u' }, device: { deviceId: 'd', supportedInterfaces: {} } } },
      request: { requestId: 'r', timestamp: new Date().toISOString(), locale: 'en-US', ...toRequest(utterance) },
    });
    attributes = res.sessionAttributes || {};
    console.log(`> A: ${strip(res.response.outputSpeech.ssml)}  `);
    if (res.response.shouldEndSession) { console.log('> (session ended)\n'); return; }
  }
  console.log();
}

(async () => {
  await scenario('Happy path', ['Sam', 'music']);
  await scenario('Misrecognition then recovery', ['blorp', 'Sam', 'news']);
  await scenario('Repeated failure exits gracefully', ['blorp', 'blorp', 'blorp']);
  await scenario('Ungrounded question gets a grounded answer', ['Sam', 'what can you do']);
})();
