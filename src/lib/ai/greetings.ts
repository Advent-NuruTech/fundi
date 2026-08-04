// Zero-cost instant replies for common greetings, thanks and acknowledgements.
//
// A large share of assistant traffic is "hi", "thanks", "good morning" — none
// of it needs an LLM. Answering these locally costs nothing, returns in
// milliseconds and never touches the credit wallet. The exchange is still
// persisted to `ai_messages` so the conversation memory stays complete.
//
// SAFETY: detection is deliberately conservative. It only fires when the WHOLE
// message is a greeting/thanks. Anything longer, anything with digits/links, or
// a real question falls through to the LLM.

export type InstantGreetingCategory =
  | "greeting" // generic hi/hello/hey/jambo/karibu…
  | "time_greeting" // good morning / good afternoon / good night…
  | "how_are_you"
  | "thanks"
  | "welcome"
  | "ack"; // ok / sawa / fine / noted…

export interface GreetingContext {
  /** e.g. "Acme Tailors Assistant" or "FundiFlow". */
  assistantName: string;
  /** e.g. "your AI Business Consultant". Optional for the public widget. */
  role?: string;
}

const GREETING = new Set([
  "hi",
  "hii",
  "hie",
  "hey",
  "heya",
  "hiya",
  "hello",
  "hallo",
  "halo",
  "howdy",
  "yo",
  "sasa",
  "jambo",
  "habari",
  "mambo",
  "vipi",
  "sup",
  "karibu",
  "hi there",
  "hello there",
  "hey there",
  "hey hey",
  "hi hi",
  "welcome back",
  "greetings",
]);

const TIME_GREETING = new Set([
  "morning",
  "good morning",
  "goodmorning",
  "afternoon",
  "good afternoon",
  "goodafternoon",
  "evening",
  "good evening",
  "goodevening",
  "good night",
  "goodnight",
  "good day",
  "goodday",
]);

const HOW_ARE_YOU = new Set([
  "how are you",
  "how r u",
  "how ru",
  "how are you doing",
  "how you doing",
  "how's it going",
  "how is it going",
  "how's going",
  "how are things",
  "how are you today",
  "are you ok",
  "are you okay",
  "r u ok",
  "u ok",
  "habari yako",
  "mambo vipi",
  "u poa",
  "niko poa",
  "hw r u",
  "hru",
]);

const THANKS = new Set([
  "thanks",
  "thank you",
  "thankyou",
  "thank u",
  "thx",
  "ty",
  "asante",
  "asante sana",
  "asante nyingi",
  "shukran",
  "merci",
  "cheers",
  "thanks a lot",
  "thanks so much",
  "thanks very much",
  "thanks a bunch",
  "thanks a ton",
  "thank you so much",
  "thank you very much",
  "much obliged",
  "appreciate it",
  "appreciated",
]);

const WELCOME = new Set(["welcome", "karibu sana"]);

const ACK = new Set([
  "ok",
  "okay",
  "oks",
  "okie",
  "okey",
  "k",
  "sawa",
  "sawa sawa",
  "safi",
  "poa",
  "fine",
  "good",
  "great",
  "nice",
  "alright",
  "all right",
  "right",
  "cool",
  "noted",
  "got it",
  "alrighty",
  "perfect",
  "nzuri",
  "vizuri",
]);

function normalize(msg: string): string {
  return msg
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "")
    .replace(/[.!?,;:\u2026]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapses repeated letters ("heyyy" → "hey") without touching real words. */
function collapseRepeats(msg: string): string {
  return msg.replace(/(.)\1+/g, "$1");
}

function inSet(set: Set<string>, original: string, collapsed: string): boolean {
  return set.has(original) || set.has(collapsed);
}

/** Returns the category when the whole message is a greeting, else null. */
export function detectInstantGreeting(message: string): InstantGreetingCategory | null {
  const raw = message.trim();
  if (!raw) return null;
  if (raw.length > 32) return null;
  if (/\d/.test(raw)) return null;
  if (/https?:\/\/|www\./i.test(raw)) return null;
  if (/[\r\n]/.test(raw)) return null;

  const original = normalize(raw);
  const collapsed = collapseRepeats(original);
  if (!original) return null;

  if (inSet(TIME_GREETING, original, collapsed)) return "time_greeting";
  if (inSet(HOW_ARE_YOU, original, collapsed)) return "how_are_you";
  if (inSet(THANKS, original, collapsed)) return "thanks";
  if (inSet(WELCOME, original, collapsed)) return "welcome";
  if (inSet(GREETING, original, collapsed)) return "greeting";
  if (inSet(ACK, original, collapsed)) return "ack";
  return null;
}

function greetingWord(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Builds an instant, LLM-free reply when the message is a standalone greeting.
 * Returns null when the message needs the real assistant.
 */
export function buildInstantGreeting(message: string, ctx: GreetingContext): string | null {
  const category = detectInstantGreeting(message);
  if (!category) return null;

  const who = ctx.role ? `I'm ${ctx.assistantName} — ${ctx.role}.` : `I'm ${ctx.assistantName}.`;

  switch (category) {
    case "time_greeting": {
      const word = capFirst(normalize(message.trim()));
      return `${word}! ${who} How can I help you today?`;
    }
    case "greeting":
      return `${greetingWord()}! ${who} What would you like to look at today?`;
    case "how_are_you":
      return `I'm doing well, thank you! ${who} What can I help you with?`;
    case "thanks":
      return "You're most welcome! Is there anything else I can help you with?";
    case "welcome":
      return "Happy to help! What would you like to do next?";
    case "ack":
      return "Got it — what would you like to do next?";
  }
}
