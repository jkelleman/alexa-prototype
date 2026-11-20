const Alexa = require('ask-sdk-core');
const FirstWords = require('./dialog');
const screenDocument = require('./apl/screen.json');

// Translate an Alexa request into a dialog engine event.
function toEvent(envelope) {
  const type = Alexa.getRequestType(envelope);
  if (type === 'LaunchRequest') return { type: 'launch' };
  if (type === 'Alexa.Presentation.APL.UserEvent') {
    const choice = String((envelope.request.arguments || [])[0] || '').toLowerCase();
    if (choice === 'skip' || choice === 'yes' || choice === 'no') return { type: choice };
    return { type: 'interest', value: choice };
  }
  if (type !== 'IntentRequest') return null;

  switch (Alexa.getIntentName(envelope)) {
    case 'NameIntent': {
      const name = Alexa.getSlotValue(envelope, 'name');
      return name ? { type: 'name', value: name } : { type: 'unknown' };
    }
    case 'InterestIntent': {
      // Prefer the resolved value; fall back to what was heard, which the
      // engine confirms ("Did you say news?") when it's only a close match.
      const slot = Alexa.getSlot(envelope, 'interest');
      const resolved = slot && slot.resolutions && slot.resolutions.resolutionsPerAuthority
        && slot.resolutions.resolutionsPerAuthority.find((r) => r.status && r.status.code === 'ER_SUCCESS_MATCH');
      const value = resolved ? resolved.values[0].value.name : slot && slot.value;
      return value ? { type: 'interest', value } : { type: 'unknown' };
    }
    case 'SkipIntent': return { type: 'skip' };
    case 'AMAZON.YesIntent': return { type: 'yes' };
    case 'AMAZON.NoIntent': return { type: 'no' };
    case 'AMAZON.HelpIntent': return { type: 'help' };
    case 'AMAZON.StopIntent':
    case 'AMAZON.CancelIntent':
    case 'AMAZON.NavigateHomeIntent': return { type: 'stop' };
    default: return { type: 'unknown' }; // includes AMAZON.FallbackIntent
  }
}

const hasScreen = (envelope) => Boolean(Alexa.getSupportedInterfaces(envelope)['Alexa.Presentation.APL']);

const Conversation = {
  canHandle: (h) => toEvent(h.requestEnvelope) !== null,
  handle: (h) => {
    const attrs = h.attributesManager.getSessionAttributes();
    const result = FirstWords.next(attrs.state || null, toEvent(h.requestEnvelope));
    h.attributesManager.setSessionAttributes({ state: result.state });

    const rb = h.responseBuilder.speak(result.say);
    if (!result.end) rb.reprompt(result.reprompt);
    if (hasScreen(h.requestEnvelope) && result.screen) {
      rb.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'firstWordsScreen',
        document: screenDocument,
        datasources: { payload: { screen: { hint: '', choices: [], ...result.screen } } },
      });
    }
    return rb.withShouldEndSession(result.end).getResponse();
  },
};

const SessionEnded = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: (h) => h.responseBuilder.getResponse(),
};

const ErrorHandler = {
  canHandle: () => true,
  handle: (h, e) => {
    console.log(e);
    return h.responseBuilder.speak('Sorry, something went wrong. Please try again.').reprompt('Please try again.').getResponse();
  },
};

exports.toEvent = toEvent;
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(Conversation, SessionEnded)
  .addErrorHandlers(ErrorHandler)
  .lambda();
