/*
 * First Words dialog engine.
 *
 * One source of truth for the onboarding conversation. The Alexa skill
 * (index.js) and the browser demo (../../app.js) both call next(), so the
 * copy, recovery rules, and screen content can't drift apart.
 *
 * Works in Node (require) and in the browser (window.FirstWords).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FirstWords = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const INVOCATION = 'first words';
  const INTERESTS = ['music', 'news', 'smart home'];
  const MAX_RETRIES = 2;
  // Kept in sync with the InterestType synonyms in the interaction model.
  const SYNONYMS = {
    songs: 'music', tunes: 'music', playlists: 'music',
    headlines: 'news', 'the news': 'news', 'news briefing': 'news',
    lights: 'smart home', 'smart devices': 'smart home', 'home devices': 'smart home', 'my home': 'smart home',
  };

  // What the user can try right after setup. These are built-in Alexa
  // requests, so the agent only points to things that exist.
  const NEXT_STEP = {
    music: 'Alexa, play some jazz',
    news: "Alexa, what's the news?",
    'smart home': 'Alexa, turn on the lights',
  };

  // Design principles, tied to eval/rubric.md. The demo shows these as notes.
  const PRINCIPLES = {
    'one-question': { label: 'One question', detail: 'Each turn asks exactly one thing.', rubric: 'Single question' },
    brief: { label: 'Brief', detail: 'Short sentences the listener can hold in memory.', rubric: 'Brevity' },
    'choices-spoken': { label: 'Choices spoken', detail: 'Options are said out loud, so the user knows what to say.', rubric: 'Next step clarity' },
    'name-once': { label: 'Name used once', detail: 'Personal, without overdoing it.', rubric: 'Grounding' },
    grounded: { label: 'Grounded', detail: 'Only claims what is built or what the user said.', rubric: 'Grounding' },
    'recovery-rephrase': { label: 'Rephrase, not repeat', detail: 'Recovery changes the wording and adds an example.', rubric: 'Recovery' },
    'no-blame': { label: 'No blame', detail: '"I didn\'t catch that," never "you said it wrong."', rubric: 'Recovery' },
    confirm: { label: 'Confirm, don\'t assume', detail: 'A close match is checked before acting on it.', rubric: 'Recovery' },
    'user-control': { label: 'User control', detail: 'The user can skip sharing their name.', rubric: 'Recovery' },
    'state-aware-help': { label: 'Help that knows where you are', detail: 'Help answers for the current step.', rubric: 'Next step clarity' },
    'next-step': { label: 'Explicit next step', detail: 'Ends by telling the user exactly what to say next.', rubric: 'Next step clarity' },
    'graceful-exit': { label: 'Graceful exit', detail: 'After two misses, it lets the user go and says how to come back.', rubric: 'Recovery' },
    flexible: { label: 'Flexible order', detail: 'If the user jumps ahead, the agent follows.', rubric: 'Recovery' },
  };

  const ASK_INTEREST = 'Do you want music, news, or smart home?';
  const EXIT = `No problem. Say "Alexa, open ${INVOCATION}" any time.`;

  const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }

  // Exact match, close match (needs confirming), or nothing.
  function matchInterest(raw) {
    const v = String(raw || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (!v) return null;
    const exact = INTERESTS.find((i) => v === i || v.includes(i) || v.replace(/ /g, '') === i.replace(/ /g, ''));
    if (exact) return { value: exact, confident: true };
    const syn = Object.keys(SYNONYMS).find((k) => v === k || v.includes(k));
    if (syn) return { value: SYNONYMS[syn], confident: true };
    let best = null;
    for (const i of INTERESTS) {
      const d = levenshtein(v, i);
      if (d <= 2 && d < i.length / 2 && (!best || d < best.d)) best = { value: i, d };
    }
    return best ? { value: best.value, confident: false } : null;
  }

  function start() {
    return respond({ step: 'name', retries: 0, silences: 0 }, {
      say: "Hi, I'm Alexa. What should I call you?",
      reprompt: 'You can say a first name, like Sam, or say skip.',
      screen: { title: 'What should I call you?', choices: [] },
      notes: ['brief', 'one-question'],
    });
  }

  function respond(state, r) {
    const reprompt = r.end ? null : (r.reprompt || r.say);
    return {
      state: { ...state, lastReprompt: reprompt, lastScreen: r.screen },
      say: r.say,
      reprompt,
      end: Boolean(r.end),
      screen: r.screen,
      notes: r.notes || [],
    };
  }

  const askInterest = (state, say, notes) => respond(
    { ...state, step: 'interest', retries: 0, silences: 0, pending: null },
    { say, reprompt: `Just say one: music, news, or smart home.`,
      screen: { title: 'Music, news, or smart home?', choices: ['Music', 'News', 'Smart home'] },
      notes });

  function finish(state, interest) {
    const tip = NEXT_STEP[interest];
    return respond({ ...state, step: 'done', interest, pending: null }, {
      say: `Great, ${interest} it is. To start, try saying, "${tip}${/[?!]$/.test(tip) ? '' : '.'}"`,
      end: true,
      screen: { title: state.name ? `You're all set, ${state.name}` : "You're all set", hint: `Try: “${tip}”`, choices: [] },
      notes: ['next-step', 'grounded', 'brief'],
    });
  }

  function exit(state) {
    return respond({ ...state, step: 'exited' }, {
      say: EXIT, end: true,
      screen: { title: 'See you soon', hint: `Say “Alexa, open ${cap(INVOCATION)}” any time`, choices: [] },
      notes: ['graceful-exit', 'no-blame'],
    });
  }

  // A miss on the current step: rephrase with an example, then exit after MAX_RETRIES.
  function retry(state) {
    const retries = (state.retries || 0) + 1;
    if (retries > MAX_RETRIES) return exit(state);
    const s = { ...state, retries, pending: null };
    if (state.step === 'name') {
      return respond(s, retries === 1
        ? { say: "Sorry, I didn't catch that. What should I call you? You can also say skip.",
            screen: { title: 'What should I call you?', choices: ['Skip'] }, notes: ['no-blame', 'recovery-rephrase', 'user-control'] }
        : { say: 'Let\'s try once more. Say a first name, like Sam, or say skip.',
            screen: { title: 'Say a first name, like “Sam”', choices: ['Skip'] }, notes: ['recovery-rephrase', 'no-blame'] });
    }
    return respond(s, retries === 1
      ? { say: `Sorry, I didn't get that. ${ASK_INTEREST}`,
          screen: { title: 'Music, news, or smart home?', choices: ['Music', 'News', 'Smart home'] }, notes: ['no-blame', 'choices-spoken'] }
      : { say: 'Just say one: music, news, or smart home.',
          screen: { title: 'Say “music,” “news,” or “smart home”', choices: ['Music', 'News', 'Smart home'] }, notes: ['recovery-rephrase', 'brief'] });
  }

  function handleInterest(state, raw) {
    const m = matchInterest(raw);
    if (!m) return retry(state);
    if (m.confident) return finish(state, m.value);
    return respond({ ...state, step: 'confirm', pending: m.value }, {
      say: `Did you say ${m.value}?`,
      reprompt: `Did you say ${m.value}? You can say yes or no.`,
      screen: { title: `Did you say “${m.value}”?`, choices: ['Yes', 'No'] },
      notes: ['confirm', 'brief'],
    });
  }

  /**
   * Advance the conversation.
   * event: { type: 'launch' | 'name' | 'interest' | 'skip' | 'yes' | 'no'
   *                | 'help' | 'stop' | 'unknown' | 'silence', value? }
   */
  function next(state, event) {
    if (event.type === 'launch') return start();
    // A session can open with an intent ("ask first words for news"), or a new
    // session can follow a finished one. Start fresh, then handle the event.
    if (!state || state.step === 'done' || state.step === 'exited') {
      state = start().state;
      if (event.type === 'silence') return start();
    }
    // Any real input gives the next silence a fresh reprompt, as on Alexa.
    if (event.type !== 'silence') state = { ...state, silences: 0 };

    switch (event.type) {
      case 'stop':
        return respond({ ...state, step: 'exited' }, {
          say: EXIT, end: true,
          screen: { title: 'See you soon', hint: `Say “Alexa, open ${cap(INVOCATION)}” any time`, choices: [] },
          notes: ['graceful-exit'],
        });

      case 'silence': {
        // Mirrors Alexa: one reprompt on silence, then the session closes quietly.
        const silences = (state.silences || 0) + 1;
        if (silences > 1) {
          return respond({ ...state, step: 'exited', silences }, {
            say: '', end: true,
            screen: { title: 'Session ended', hint: 'Alexa closes the session after a second silence.', choices: [] },
            notes: ['graceful-exit'],
          });
        }
        return respond({ ...state, silences }, {
          say: state.lastReprompt, reprompt: state.lastReprompt,
          screen: state.step === 'name' ? { title: 'What should I call you?', choices: ['Skip'] } : state.lastScreen,
          notes: ['recovery-rephrase', 'no-blame'],
        });
      }

      case 'help':
        if (state.step === 'name') {
          return respond(state, {
            say: "I'm getting you set up. First, what should I call you? You can also say skip.",
            screen: { title: 'What should I call you?', choices: ['Skip'] },
            notes: ['state-aware-help', 'grounded', 'one-question'],
          });
        }
        return respond({ ...state, step: 'interest', pending: null }, {
          say: `Right now I can help with music, news, or smart home. Which one?`,
          screen: { title: 'Music, news, or smart home?', choices: ['Music', 'News', 'Smart home'] },
          notes: ['state-aware-help', 'grounded', 'one-question'],
        });

      default:
        break;
    }

    if (state.step === 'name') {
      if (event.type === 'name' && event.value) {
        const name = cap(String(event.value).trim());
        return askInterest({ ...state, name }, `Nice to meet you, ${name}. ${ASK_INTEREST}`,
          ['name-once', 'one-question', 'choices-spoken']);
      }
      if (event.type === 'skip' || event.type === 'no') {
        return askInterest(state, `No problem. ${ASK_INTEREST}`, ['user-control', 'one-question', 'choices-spoken']);
      }
      if (event.type === 'interest' && matchInterest(event.value)?.confident) {
        return { ...finish(state, matchInterest(event.value).value), notes: ['flexible', 'next-step', 'grounded'] };
      }
      return retry(state);
    }

    if (state.step === 'confirm') {
      if (event.type === 'yes') return finish(state, state.pending);
      if (event.type === 'no') return askInterest(state, `OK. ${ASK_INTEREST}`, ['confirm', 'choices-spoken']);
      if (event.type === 'interest') return handleInterest({ ...state, step: 'interest' }, event.value);
      return retry({ ...state, step: 'interest' });
    }

    // step === 'interest'
    if (event.type === 'interest') return handleInterest(state, event.value);
    return retry(state);
  }

  // ---------------------------------------------------------------------
  // Browser-only understanding. On Alexa, the interaction model does this.
  // AMAZON.FirstName covers thousands of names; this demo uses a short list
  // plus "call me ___" / "my name is ___" for any name.
  const NAMES = new Set(('aaliyah aaron abby adam aiden alex alexa alice amanda amy ana andre andrea andrew angela anna anthony ari ava ben beth bob brian carla carlos carmen charlie chloe chris claire dan dana daniel david diana diego elena eli ella emily emma eric eva evan grace hannah henry ian isaac isabella jack jacob james jamie jane jasmine jason jen jenny jennifer jess jessica jo joe john jordan jose josh julia kate katie kelly kevin kim laura leo liam lily linda lisa logan lucas lucy luis maria mark mary matt maya megan mia michael michelle mike mohammed nate nina noah olivia omar pat paul priya rachel raj ray riley rob rosa ryan sam sara sarah sean sofia sophia steve taylor tom tony victor wei will zoe').split(' '));
  const STOP_WORDS = /^(stop|cancel|quit|exit|goodbye|bye|nevermind|never mind)$/;

  function parse(text, state) {
    const t = String(text || '').toLowerCase().replace(/[.!?,]/g, '').trim();
    if (!t) return { type: 'silence' };
    if (STOP_WORDS.test(t)) return { type: 'stop' };
    if (/^(help|what can you do|what are my options|options)$/.test(t)) return { type: 'help' };
    if (/^(yes|yeah|yep|yup|correct|right|that's right|sure)$/.test(t)) return { type: 'yes' };
    if (/^(no|nope|nah|wrong|not really)$/.test(t)) return { type: state && state.step === 'name' ? 'skip' : 'no' };
    // Kept in sync with SkipIntent samples in the interaction model.
    if (/^(skip|skip that|pass|i'd rather not( say)?|rather not( say)?|no thanks|i don't want to( say)?)$/.test(t)) return { type: 'skip' };

    const step = state && state.step;
    if (step === 'name') {
      const m = t.match(/^(?:my name is|call me|i'm|i am|it's|its)\s+([a-z][a-z'-]{0,19})$/);
      if (m) return { type: 'name', value: m[1] };
      if (NAMES.has(t)) return { type: 'name', value: t };
    }
    if (matchInterest(t)) return { type: 'interest', value: t };
    return { type: 'unknown' };
  }

  // Scenarios shared by the web demo's "Play" buttons and chat.js transcripts.
  // An empty string is silence.
  const SCENARIOS = [
    { id: 'happy', title: 'Happy path', blurb: 'Name, choice, next step. Two answers and you are done.', inputs: ['Sam', 'music'] },
    { id: 'recovery', title: 'Recovery', blurb: 'An unrecognized answer gets a rephrase and an example, never blame.', inputs: ['blorp', 'call me Jen', 'news'] },
    { id: 'misrecognition', title: 'Misrecognition', blurb: 'A close match is confirmed before the agent acts on it.', inputs: ['Sam', 'neus', 'yes'] },
    { id: 'grounded', title: '"What can you do?"', blurb: 'Help only claims what is built, and knows which step you are on.', inputs: ['Priya', 'what can you do', 'smart home'] },
    { id: 'skip', title: 'Skip my name', blurb: 'The user stays in control of what they share.', inputs: ['skip', 'news'] },
    { id: 'exit', title: 'Graceful exit', blurb: 'After two misses, the agent lets go and says how to come back.', inputs: ['blorp', 'blorp', 'blorp'] },
  ];

  return { INVOCATION, INTERESTS, MAX_RETRIES, NEXT_STEP, PRINCIPLES, SCENARIOS, start, next, parse, matchInterest };
});
