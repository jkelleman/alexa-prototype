# Annotated dialogs

Scores are self-scored against `eval/rubric.md`. Every agent line below comes from the shared dialog engine (`skill/lambda/dialog.js`); full generated transcripts are in `transcripts.md`.

## 1. Happy path (10/10)

> A: Hi, I'm Alexa. What should I call you?  
> U: Sam  
> A: Nice to meet you, Sam. Do you want music, news, or smart home?  
> U: Music  
> A: Great, music it is. To start, try saying, "Alexa, play some jazz."

One question per turn; the name is used once; ends with an explicit next step.

## 2. Recovery from unrecognized input (10/10)

> A: Hi, I'm Alexa. What should I call you?  
> U: blorp  
> A: Sorry, I didn't catch that. What should I call you? You can also say skip.  
> U: blorp  
> A: Let's try once more. Say a first name, like Sam, or say skip.  
> U: blorp  
> A: No problem. Say "Alexa, open first words" any time.

Each reprompt changes the wording and adds something new: first the option to skip, then an example. After two misses, the agent exits without blame and says how to come back. Silence is different: Alexa sends one reprompt and then ends the session itself.

_Earlier version (8/10): both reprompts repeated the same sentence, and there was no option to skip._

## 3. Misrecognition (9/10)

> A: Nice to meet you, Sam. Do you want music, news, or smart home?  
> U: Neus  
> A: Did you say news?  
> U: Yes  
> A: Great, news it is. To start, try saying, "Alexa, what's the news?"

Confirms a close match before acting. On Alexa, this triggers when the slot value doesn't resolve to a known choice; the engine checks spelling distance to find the likely match. Loses a point because the confirmation adds a turn even when the guess is very likely right.

_Earlier version: designed but not built. Now implemented and tested._

## 4. Ungrounded answer: before and after

**Before (4/10)**
> U: What can you do?  
> A: I can do thousands of things, including ordering your favorite pizza from your usual place.

Invents a capability and a user preference.

**After (10/10)**
> U: What can you do?  
> A: Right now I can help with music, news, or smart home. Which one?

Only claims what's built; ends with one question. Help also depends on the step: before the name question is answered, it says "I'm getting you set up. First, what should I call you? You can also say skip."

## 5. Skipping the name (10/10)

> A: Hi, I'm Alexa. What should I call you?  
> U: Skip  
> A: No problem. Do you want music, news, or smart home?

The user decides what to share. The flow continues with no penalty, and the final screen says "You're all set" without a name.
