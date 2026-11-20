# Multimodal notes

- The screen template lives in `skill/lambda/apl/screen.json`. The skill fills it from the engine's `screen` data on every turn: a title that mirrors what Alexa said, an optional hint, and buttons for the same choices the voice offers.
- Tapping a button sends an APL `UserEvent`, which the skill treats exactly like saying the choice.
- The screen never carries information the voice lacks. A test in `skill/lambda/test.js` checks that every button on screen was also said out loud.
- Voice-only devices get no screen directive.
- **Untested**: not yet validated in the Alexa simulator or on a device. Check in the Developer Console APL authoring tool before relying on it.
- `screen-mockup.svg` is the original static mockup. The web demo shows the same screen states live.
