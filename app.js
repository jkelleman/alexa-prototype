const steps = [
  { say: "Hi! I'm your assistant. What should I call you?", key: "name" },
  { say: "Nice to meet you, {name}. Which do you prefer: music, news, or smart home?", key: "interest" },
  { say: "Great, I'll set up {interest} for you. Say done to finish.", key: "confirm" },
];

const $ = (id) => document.getElementById(id);
const answers = {};
let i = 0;

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function fill(text) {
  return text.replace(/\{(\w+)\}/g, (_, k) => answers[k] || "");
}

function speak(text) {
  return new Promise((resolve) => {
    $("prompt").textContent = text;
    const u = new SpeechSynthesisUtterance(text);
    u.onend = resolve;
    speechSynthesis.speak(u);
  });
}

function listen() {
  return new Promise((resolve) => {
    if (!Recognition) return resolve(prompt("Type your answer:") || "");
    const r = new Recognition();
    r.lang = "en-US";
    $("orb").classList.add("listening");
    r.onresult = (e) => resolve(e.results[0][0].transcript);
    r.onerror = () => resolve("");
    r.onend = () => $("orb").classList.remove("listening");
    r.start();
  });
}

async function run() {
  $("start").hidden = true;
  $("skip").hidden = false;
  for (; i < steps.length; i++) {
    await speak(fill(steps[i].say));
    const heard = (await listen()).trim();
    $("heard").textContent = heard ? `Heard: "${heard}"` : "Didn't catch that.";
    if (!heard) { i--; continue; }
    answers[steps[i].key] = heard;
  }
  await speak(`All set, ${answers.name}!`);
  $("skip").hidden = true;
}

$("start").onclick = run;
$("skip").onclick = () => { speechSynthesis.cancel(); location.reload(); };
