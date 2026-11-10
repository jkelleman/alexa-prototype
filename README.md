<p align="center"><img src="assets/banner.svg" alt="First Words: voice-first onboarding prototype" width="100%"></p>

<p align="center">
  <a href="https://github.com/jkelleman/alexa-prototype/actions/workflows/ci.yml"><img src="https://github.com/jkelleman/alexa-prototype/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/status-prototype-orange" alt="Status: prototype">
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node.js 20">
  <img src="https://img.shields.io/badge/ASK%20SDK-v2-00caff" alt="ASK SDK v2">
  <img src="https://img.shields.io/badge/APL-2023.3%20(untested)-lightgrey" alt="APL 2023.3, untested">
</p>

# First Words

**A voice-first onboarding prototype.** A prototype of a voice-first onboarding conversation for Alexa, with an Echo Show multimodal companion.

## Problem

First-run setup is usually screen-driven. On a voice device, users abandon long menus and can't tell what the assistant can do. Goal: get a new user to a first successful task in under a minute, by voice alone.

## Principles

1. One question per turn.
2. Ground every answer in what the user said or in known data; never invent.
3. Recover from silence and misrecognition without blame.
4. The screen supports the voice; it never carries information the voice lacks.

## Decisions and tradeoffs

| Decision | Alternative | Tradeoff |
|---|---|---|
| Ask name first | Skip personalization | Warmer, but one more turn before value |
| Offer 3 choices (music, news, smart home) | Open-ended "what do you want?" | Faster to answer, narrower discovery |
| Two reprompts on unrecognized input, then exit gracefully | Loop until answered | Less frustrating, may lose some users. Silence gets Alexa's single built-in reprompt |
| APL screen mirrors speech | Rich screen-only content | Works on non-screen devices |

## Repo layout

- `design/dialogs.md`: annotated dialogs scored against the rubric
- `design/flow.svg`: conversation flow with recovery branch
- `eval/rubric.md`, `prompts/persona.md`
- `multimodal/`: APL document, notes, `screen-mockup.svg`
- `skill/`: minimal Alexa skill (Node.js, ASK SDK v2)
- `index.html`, `app.js`, `style.css`: browser voice demo

## Status (honest)

- The APL document is a draft and **has not been tested in the Alexa simulator**.
- The skill has not been deployed or tested in the Alexa Developer Console.
- Dialog scores in `design/dialogs.md` are **self-scored**, not from user research.

_Independent portfolio project. Not affiliated with or endorsed by Amazon._
