/* First Words web demo. All conversation logic lives in skill/lambda/dialog.js. */
(() => {
  const FW = window.FirstWords;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  if (params.has('embed')) document.body.classList.add('embed');

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = 'speechSynthesis' in window;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = null;   // last engine result
  let runId = 0;        // cancels an in-flight scenario when something new starts
  let voice = null;
  let recognizer = null; // active speech recognition, if any

  // ---------- voice output
  function pickVoice() {
    if (!canSpeak) return;
    const voices = speechSynthesis.getVoices();
    voice = voices.find((v) => /en-US/.test(v.lang) && /Google|Samantha|Aria|Jenny/.test(v.name))
      || voices.find((v) => /en-US/.test(v.lang)) || voices[0] || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function speak(text) {
    return new Promise((resolve) => {
      if (!text) return resolve();
      if (!$('sound').checked || !canSpeak) {
        setLight('speaking');
        return setTimeout(() => { setLight('idle'); resolve(); }, Math.min(2600, 500 + text.length * 28));
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.onstart = () => setLight('speaking');
      u.onend = u.onerror = () => { setLight('idle'); resolve(); };
      speechSynthesis.speak(u);
    });
  }

  function setLight(mode) { $('lightbar').dataset.mode = mode; }

  // ---------- rendering
  function renderScreen(screen) {
    $('screen-title').textContent = screen.title || '';
    $('screen-hint').textContent = screen.hint || '';
    const box = $('screen-choices');
    box.replaceChildren();
    for (const choice of screen.choices || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = choice;
      b.addEventListener('click', () => userTurn(choice, 'tap'));
      box.append(b);
    }
  }

  function addTurn(role, text, notes, how) {
    const li = document.createElement('li');
    li.className = `turn ${role}`;
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = role === 'agent' ? 'Alexa' : 'You';
    const bubble = document.createElement('p');
    bubble.className = 'bubble';
    bubble.textContent = text;
    li.append(who, bubble);
    if (how) {
      const tag = document.createElement('span');
      tag.className = 'how-tag';
      tag.textContent = how;
      li.append(tag);
    }
    if (notes && notes.length) {
      const ul = document.createElement('ul');
      ul.className = 'notes';
      for (const id of notes) {
        const p = FW.PRINCIPLES[id];
        const chip = document.createElement('li');
        chip.tabIndex = 0;
        chip.textContent = p.label;
        chip.title = `${p.detail} Rubric: ${p.rubric}.`;
        chip.setAttribute('aria-label', `${p.label}: ${p.detail} Rubric criterion: ${p.rubric}.`);
        ul.append(chip);
      }
      li.append(ul);
    }
    $('transcript').append(li);
    scrollTranscript();
  }

  // Scroll only the transcript, never the page.
  function scrollTranscript() {
    const t = $('transcript');
    t.scrollTo({ top: t.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function addSystem(text) {
    const li = document.createElement('li');
    li.className = 'turn system';
    li.textContent = text;
    $('transcript').append(li);
    scrollTranscript();
  }

  function setInputEnabled(on) {
    $('type-input').disabled = !on;
    $('send').disabled = !on;
    $('talk').disabled = !on;
    for (const b of $('screen-choices').querySelectorAll('button')) b.disabled = !on;
  }

  // ---------- conversation
  // Returns false if a newer conversation started while this turn was speaking.
  async function agentTurn(result, id = runId) {
    if (id !== runId) return false;
    current = result;
    renderScreen(result.screen);
    if (result.say) addTurn('agent', result.say, result.notes);
    else addSystem('(No response. The session closes after a second silence.)');
    setInputEnabled(false);
    await speak(result.say);
    if (id !== runId) return false;
    if (result.end) {
      addSystem('Session ended.');
      $('start').textContent = 'Start over';
      $('start').hidden = false;
    } else {
      setInputEnabled(true);
    }
    return true;
  }

  async function userTurn(text, how, id = runId) {
    if (id !== runId || !current || current.end) return;
    const event = FW.parse(text, current.state);
    addTurn('user', text || '(silence)', null, how);
    const ok = await agentTurn(FW.next(current.state, event), id);
    if (ok && !current.end && how === 'type') $('type-input').focus();
  }

  // Start a new conversation: cancel speech, listening, and any scenario in flight.
  function newRun() {
    runId++;
    if (canSpeak) speechSynthesis.cancel();
    if (recognizer) { recognizer.abort(); recognizer = null; }
    return runId;
  }

  async function begin() {
    const id = newRun();
    $('transcript').replaceChildren();
    $('start').hidden = true;
    for (const b of document.querySelectorAll('.scenario-list button')) b.setAttribute('aria-pressed', 'false');
    if (await agentTurn(FW.start(), id) && !current.end) $('type-input').focus();
  }

  // ---------- scenarios
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function play(scenario, limit = Infinity) {
    const id = newRun();
    $('transcript').replaceChildren();
    $('start').hidden = true;
    addSystem(`Scenario: ${scenario.title}. ${scenario.blurb}`);
    for (const b of document.querySelectorAll('.scenario-list button')) b.setAttribute('aria-pressed', String(b.dataset.id === scenario.id));
    if (!await agentTurn(FW.start(), id)) return;
    for (const input of scenario.inputs.slice(0, limit)) {
      setInputEnabled(false);
      await wait(reducedMotion ? 200 : 700);
      if (id !== runId) return;
      const event = FW.parse(input, current.state);
      addTurn('user', input || '(silence)', null, 'scenario');
      if (!await agentTurn(FW.next(current.state, event), id)) return;
      if (current.end) break;
    }
  }

  function renderScenarios() {
    for (const s of FW.SCENARIOS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = s.id;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<strong></strong><span></span>`;
      b.querySelector('strong').textContent = s.title;
      b.querySelector('span').textContent = s.blurb;
      b.addEventListener('click', () => play(s));
      $('scenarios').append(b);
    }
  }

  // ---------- speech input
  function listenOnce() {
    return new Promise((resolve) => {
      const r = new Recognition();
      recognizer = r;
      r.lang = 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 1;
      let heard = '';
      setLight('listening');
      r.onresult = (e) => { heard = e.results[0][0].transcript; };
      r.onerror = () => {};
      r.onend = () => { if (recognizer === r) recognizer = null; setLight('idle'); resolve(heard); };
      r.start();
    });
  }

  if (Recognition) {
    $('talk').hidden = false;
    $('talk-note').hidden = false;
    $('talk').textContent = '🎙 Talk';
    $('talk').addEventListener('click', async () => {
      if (!current || current.end) return;
      const id = runId;
      if (canSpeak) speechSynthesis.cancel();
      setInputEnabled(false);
      const heard = await listenOnce();
      if (id !== runId) return; // a new conversation started while listening
      await userTurn(heard.trim(), 'voice', id);
    });
  }

  // ---------- wiring
  $('start').addEventListener('click', begin);
  $('type-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('type-input').value;
    $('type-input').value = '';
    userTurn(text.trim(), 'type');
  });
  $('notes-toggle').addEventListener('change', (e) => document.body.classList.toggle('hide-notes', !e.target.checked));
  $('sound').addEventListener('change', (e) => { if (!e.target.checked && canSpeak) speechSynthesis.cancel(); });

  renderScenarios();
  setLight('idle');
  setInputEnabled(false);

  // ?play=<scenario id> runs a scenario on load with the voice off (for embeds and previews).
  // &steps=N stops after N user turns, leaving the demo live from that point.
  const auto = FW.SCENARIOS.find((s) => s.id === params.get('play'));
  if (auto) { $('sound').checked = false; play(auto, Number(params.get('steps')) || Infinity); }
})();
