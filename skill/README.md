# First Words skill

Node.js, ASK SDK v2. The conversation itself lives in `lambda/dialog.js`, shared with the web demo. `lambda/index.js` translates Alexa requests into engine events and sends the APL screen on devices that have one.

- `interactionModels/custom/en-US.json`: invocation `first words`; intents `NameIntent`, `InterestIntent`, `SkipIntent`, plus built-in Help, Yes, No, Stop, Cancel, Fallback, and NavigateHome; synonyms for each interest
- `lambda/dialog.js`: the dialog engine (copy, recovery, screen data)
- `lambda/index.js`: request handler
- `lambda/apl/screen.json`: APL screen template

## Run

1. `cd lambda && npm install && npm test`
   - `npm run transcripts` regenerates `design/transcripts.md` from the engine.
2. Paste `en-US.json` into the Developer Console build tab; deploy the `lambda` folder (with `node_modules`) or use the ASK CLI. Turn on the APL interface in the console to get the screen.
3. In the Test tab say: "open first words".

Not yet tested in the simulator.
