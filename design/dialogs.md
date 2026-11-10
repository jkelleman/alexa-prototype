# Annotated dialogs

Scores are self-scored against `eval/rubric.md`.

## 1. Happy path (10/10)

> A: Hi, I'm Alexa. What should I call you?  
> U: Sam  
> A: Nice to meet you, Sam. Do you want music, news, or smart home?  
> U: Music  
> A: Great. Try saying, "play some jazz."

One question per turn; ends with an explicit next step.

## 2. Recovery from unrecognized input (8/10)

> A: Hi, I'm Alexa. What should I call you?  
> U: blorp  
> A: Sorry, I didn't get that. What should I call you?  
> U: blorp  
> A: Sorry, I didn't get that. What should I call you?  
> U: blorp  
> A: No problem. Say "open onboarding demo" any time.

Two reprompts, then a graceful exit with no blame (transcript from `skill/lambda/chat.js`). Silence is different: Alexa sends one reprompt and then ends the session itself, so the skill can't add more. Loses a point for no third option.

## 3. Misrecognition (8/10)

> U: Neus  
> A: Did you say "news"?  
> U: Yes

Confirms rather than assuming.

## 4. Ungrounded answer: before and after

**Before (4/10)**
> U: What can you do?  
> A: I can do thousands of things, including ordering your favorite pizza from your usual place.

Invents a capability and a user preference.

**After (9/10)**
> U: What can you do?  
> A: Right now I can help with music, news, or smart home. Which one?

Only claims what is built; ends with one question.
