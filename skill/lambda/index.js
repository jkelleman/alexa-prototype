const Alexa = require('ask-sdk-core');

const ASK_NAME = "Hi, I'm Alexa. What should I call you?";

const reply = (h, speech, reprompt) =>
  h.responseBuilder.speak(speech).reprompt(reprompt || speech).getResponse();

const Launch = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle: (h) => reply(h, ASK_NAME),
};

const Name = {
  canHandle: (h) => Alexa.getIntentName(h.requestEnvelope) === 'NameIntent',
  handle: (h) => {
    const name = Alexa.getSlotValue(h.requestEnvelope, 'name');
    if (!name) return reply(h, 'I didn\'t catch that. You can say a name, like "Sam."');
    const attrs = h.attributesManager.getSessionAttributes();
    attrs.name = name;
    h.attributesManager.setSessionAttributes(attrs);
    return reply(h, `Nice to meet you, ${name}. Do you want music, news, or smart home?`);
  },
};

const Interest = {
  canHandle: (h) => Alexa.getIntentName(h.requestEnvelope) === 'InterestIntent',
  handle: (h) => {
    const interest = Alexa.getSlotValue(h.requestEnvelope, 'interest');
    if (!interest) return reply(h, 'Please say music, news, or smart home.');
    return h.responseBuilder.speak(`Great. I'll remember ${interest}. That's all for now.`).withShouldEndSession(true).getResponse();
  },
};

const Help = {
  canHandle: (h) => Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent' ||
    Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent',
  handle: (h) => reply(h, 'Right now I can help with music, news, or smart home. Which one?'),
};

const Stop = {
  canHandle: (h) => ['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: (h) => h.responseBuilder.speak('No problem. Say "open onboarding demo" any time.').getResponse(),
};

const SessionEnded = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: (h) => h.responseBuilder.getResponse(),
};

const ErrorHandler = {
  canHandle: () => true,
  handle: (h, e) => { console.log(e); return reply(h, 'Sorry, something went wrong. Please try again.'); },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(Launch, Name, Interest, Help, Stop, SessionEnded)
  .addErrorHandlers(ErrorHandler)
  .lambda();
