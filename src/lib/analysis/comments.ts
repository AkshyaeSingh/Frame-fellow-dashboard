// Rule-based first pass over audience comments. Transparent and cheap; the
// LLM pass can refine it later. Signals are what the team cares about:
// did the piece change minds, teach something, prompt action — or get
// dismissed as hype/doom?

export const COMMENT_SIGNALS = [
  { slug: "changed-mind", label: "Changed their mind", tone: "good", terms: ["changed my mind", "never thought about", "hadn't thought", "didn't think about it that way", "opened my eyes", "eye opening", "eye-opening", "now i see", "i was wrong", "convinced me", "made me rethink", "rethinking", "wake up call", "wake-up call"] },
  { slug: "learned", label: "Learned something", tone: "good", terms: ["i didn't know", "i did not know", "had no idea", "til ", "today i learned", "learned so much", "so informative", "great explanation", "explained so well", "finally understand", "now i understand", "this makes sense", "thanks for explaining", "well explained"] },
  { slug: "action", label: "Took or will take action", tone: "good", terms: ["i signed", "just signed", "i emailed", "emailed my", "called my", "contacted my", "wrote to my", "going to share", "gonna share", "sharing this", "sent this to", "shared this", "going to email", "going to call my", "going to write to", "i'll join", "i joined", "i applied", "i donated", "just donated", "signed the", "count me in", "where do i sign", "how can i help", "what can we do", "what can i do", "how do i get involved"] },
  { slug: "worried", label: "Worried / anxious", tone: "neutral", terms: ["scary", "terrifying", "frightening", "scared", "anxiety", "anxious", "worried", "concerning", "we're doomed", "we are doomed", "this is horrifying", "nightmare", "chills", "creepy", "unsettling"] },
  { slug: "pushback", label: "Pushback / skeptical", tone: "bad", terms: ["fear mongering", "fearmongering", "fear-mongering", "overblown", "overhyped", "hype", "clickbait", "not true", "misleading", "wrong", "nonsense", "bs", "bullshit", "just autocomplete", "just a tool", "stochastic parrot", "sci-fi", "science fiction", "propaganda", "grift", "this is dumb", "ridiculous"] },
  { slug: "doomer-label", label: "Calls it doomer / alarmist", tone: "bad", terms: ["doomer", "doomerism", "alarmist", "doom porn", "chicken little"] },
  { slug: "question", label: "Asked a question", tone: "neutral", terms: ["?"] },
  { slug: "praise", label: "Praise", tone: "good", terms: ["great video", "love this", "love your", "amazing", "brilliant", "so good", "well done", "excellent", "thank you", "thanks for", "needed this", "important video", "more people need to see", "everyone needs to see", "underrated", "keep it up", "🔥", "👏", "🙏"] },
  { slug: "wants-more", label: "Wants more", tone: "good", terms: ["part 2", "part two", "more of this", "please make", "do a video on", "follow up", "follow-up", "can you cover", "more videos"] },
] as const;

export type SignalSlug = (typeof COMMENT_SIGNALS)[number]["slug"];

const POSITIVE = ["love", "great", "amazing", "thank", "important", "brilliant", "helpful", "agree", "well said", "exactly", "so true", "needed", "incredible", "awesome", "perfect", "fantastic", "❤", "🔥", "👏", "🙏", "💯"];
const NEGATIVE = ["hate", "stupid", "dumb", "wrong", "nonsense", "clickbait", "fear mongering", "fearmongering", "bs", "bullshit", "ridiculous", "garbage", "trash", "cringe", "propaganda", "grift", "misleading", "overblown", "annoying", "worst"];

const norm = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ")} `;
const count = (t: string, terms: readonly string[]) => terms.filter((w) => (w.length <= 3 && /^[a-z]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(t) : t.includes(w))).length;

export function analyzeComment(text: string): { sentiment: "positive" | "negative" | "neutral" | "mixed"; signals: SignalSlug[] } {
  const t = norm(text);
  const signals = COMMENT_SIGNALS.filter((s) => count(t, s.terms) > 0).map((s) => s.slug);
  const pos = count(t, POSITIVE) + (signals.includes("praise") ? 1 : 0);
  const neg = count(t, NEGATIVE) + (signals.includes("pushback") || signals.includes("doomer-label") ? 1 : 0);
  const sentiment = pos && neg ? "mixed" : pos ? "positive" : neg ? "negative" : "neutral";
  return { sentiment, signals };
}
