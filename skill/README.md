# Minimal onboarding skill

Node.js, ASK SDK v2. Flow: launch, ask name, ask interest, finish. Reprompts on silence.

- `interactionModels/custom/en-US.json`: invocation `onboarding demo`, intents `NameIntent`, `InterestIntent`
- `lambda/index.js`: handlers

## Run

1. `cd lambda && npm install && npm test`
2. Paste `en-US.json` into the Developer Console build tab; paste `lambda/index.js` (with `node_modules`) or deploy via ASK CLI.
3. In the Test tab say: "open onboarding demo".

Not yet tested in the simulator.
