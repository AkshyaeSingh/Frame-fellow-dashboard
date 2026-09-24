import type { Platform } from "@prisma/client";

// Controlled vocabularies used by the tagger, filters and charts.
// Each entry's `terms` are matched case-insensitively against captions,
// titles, hashtags and transcripts by the rule-based pass (lib/analysis/rules.ts).

export const TOPICS = [
  { slug: "x-risk", label: "Catastrophic & x-risk", terms: ["existential", "extinction", "x-risk", "superintelligen", "agi", "loss of control", "doom", "p(doom)", "rogue ai", "wipe out", "end of humanity", "anéantir"] },
  { slug: "evals-demos", label: "Evals & demos", terms: ["scheming", "deceptive", "deception", "shutdown", "sabotage", "blackmail", "red team", "jailbreak", "eval", "alignment faking", "reward hacking", "sandbagging"] },
  { slug: "lab-accountability", label: "Lab accountability", terms: ["openai", "anthropic", "deepmind", "google deepmind", "xai", "meta ai", "sam altman", "altman", "dario", "musk", "whistleblow", "safety framework", "frontier lab", "ai companies", "big tech"] },
  { slug: "governance-policy", label: "Governance & policy", terms: ["regulation", "legislation", "bill", "congress", "senate", "eu ai act", "ai act", "sb 1047", "sb 53", "policy", "lawmaker", "treaty", "ban", "moratorium", "governance", "government", "election"] },
  { slug: "race-dynamics", label: "Race dynamics & power", terms: ["ai race", "arms race", "stop the race", "china", "geopolit", "concentration of power", "power grab", "palantir", "military", "war", "weapons"] },
  { slug: "jobs-economy", label: "Jobs & economy", terms: ["jobs", "unemployment", "automation", "layoff", "replace workers", "economy", "labor", "labour", "permanent underclass", "income"] },
  { slug: "kids-chatbots", label: "Kids, companions & mental health", terms: ["companion", "chatbot", "ai girlfriend", "ai boyfriend", "psychosis", "mental health", "suicide", "teen", "kids", "children", "loneliness", "character.ai", "sycophan"] },
  { slug: "info-integrity", label: "Deepfakes & info integrity", terms: ["deepfake", "misinformation", "disinformation", "propaganda", "slop", "fake video", "scam", "voice clone"] },
  { slug: "research-explainers", label: "Research explainers", terms: ["paper", "study", "researchers found", "research shows", "interpretability", "neural network", "how llms work", "transformer", "explained"] },
  { slug: "careers-field", label: "Careers & getting involved", terms: ["career", "80,000 hours", "80000 hours", "bluedot", "ai safety course", "get involved", "fellowship", "job in ai safety"] },
  { slug: "activism", label: "Activism & protest", terms: ["protest", "march", "hunger strike", "rally", "pauseai", "pause ai", "stopai", "petition", "sign the", "movement"] },
  { slug: "ai-culture", label: "AI & culture (general)", terms: ["chatgpt", "claude", "gemini", "ai art", "ai music", "prompt", "llm", "gpt-", "sora", "ai tools"] },
] as const;

// Calls to action — what the post asks the audience to do.
export const CTAS = [
  { slug: "contact-lawmaker", label: "Contact a lawmaker", terms: ["contact your representative", "call your representative", "email your mp", "write to your", "contact your senator", "contact your mp", "controlai.com", "call congress"] },
  { slug: "petition-sign", label: "Sign a petition / statement", terms: ["sign the petition", "sign the statement", "petition", "add your name", "superintelligence statement", "sign here"] },
  { slug: "protest-event", label: "Attend a protest / event", terms: ["join us at", "join the protest", "come to", "rsvp", "march on", "see you at", "stoptherace.ai"] },
  { slug: "learn-course", label: "Take a course / learn more", terms: ["bluedot", "aisafety.info", "course", "read more at", "learn more at", "resources in bio", "reading list"] },
  { slug: "career", label: "Career / get involved", terms: ["80000hours", "80,000 hours", "work on ai safety", "apply now", "fellowship", "job board"] },
  { slug: "use-tool", label: "Try a tool / demo", terms: ["civai", "try it yourself", "demo", "try this"] },
  { slug: "donate", label: "Donate / support", terms: ["donate", "patreon", "support us", "buy me a coffee", "manifund"] },
  { slug: "subscribe-follow", label: "Follow / subscribe", terms: ["subscribe", "follow for more", "follow me", "hit follow", "turn on notifications", "like and subscribe"] },
  { slug: "comment-share", label: "Comment / share", terms: ["comment below", "let me know in the comments", "share this", "send this to", "tag someone", "what do you think", "drop a"] },
  { slug: "newsletter", label: "Join newsletter", terms: ["newsletter", "substack", "subscribe to my newsletter", "mailing list"] },
  { slug: "link-in-bio", label: "Link in bio (generic)", terms: ["link in bio", "link in my bio", "link below", "link in description"] },
] as const;

// Orgs whose work fellows might promote or cite — tracks "what they're pushing".
export const ORGS = [
  { slug: "controlai", label: "ControlAI", terms: ["controlai", "control ai"] },
  { slug: "pauseai", label: "PauseAI", terms: ["pauseai", "pause ai"] },
  { slug: "stopai", label: "StopAI / Stop the Race", terms: ["stopai", "stop ai", "stoptherace", "stop the race", "stop the ai race"] },
  { slug: "cais", label: "CAIS", terms: ["cais", "center for ai safety", "safe.ai"] },
  { slug: "fli", label: "Future of Life Institute", terms: ["future of life", "fli ", "keep the future human"] },
  { slug: "miri", label: "MIRI", terms: ["miri", "machine intelligence research", "if anyone builds it", "yudkowsky", "soares"] },
  { slug: "bluedot", label: "BlueDot Impact", terms: ["bluedot"] },
  { slug: "80k", label: "80,000 Hours", terms: ["80,000 hours", "80000 hours", "80k hours", "ai in context"] },
  { slug: "civai", label: "CivAI", terms: ["civai"] },
  { slug: "seismic", label: "Seismic", terms: ["seismic"] },
  { slug: "palisade", label: "Palisade Research", terms: ["palisade"] },
  { slug: "apollo", label: "Apollo Research", terms: ["apollo research"] },
  { slug: "metr", label: "METR", terms: ["metr "] },
  { slug: "humane-tech", label: "Center for Humane Technology", terms: ["humane technology", "tristan harris"] },
  { slug: "quitgpt", label: "QuitGPT", terms: ["quitgpt", "quit gpt"] },
  { slug: "frame", label: "Frame", terms: ["frame fellowship", "@theframefellowship", "frame fellow"] },
  { slug: "mats", label: "MATS", terms: ["mats program", "ml alignment & theory"] },
  { slug: "andon", label: "Andon Labs", terms: ["andon labs", "andonlabs"] },
  { slug: "apart", label: "Apart Research", terms: ["apart research"] },
  { slug: "midas", label: "The Midas Project", terms: ["midas project"] },
  { slug: "humans-in-control", label: "Humans in Control", terms: ["humans in control"] },
] as const;

export const FRAMINGS = [
  { slug: "alarm", label: "Alarm / warning" },
  { slug: "explainer", label: "Neutral explainer" },
  { slug: "hopeful", label: "Hopeful / agency" },
  { slug: "political", label: "Political / power" },
  { slug: "personal", label: "Personal story" },
  { slug: "humor", label: "Humor / satire" },
] as const;

export const OUTCOME_TYPES = [
  { slug: "viral", label: "Viral moment" },
  { slug: "press", label: "Press / media" },
  { slug: "collab", label: "Collaboration" },
  { slug: "partnership", label: "Org partnership" },
  { slug: "grant", label: "Grant / funding" },
  { slug: "job", label: "Job / role" },
  { slug: "event", label: "Event / speaking" },
  { slug: "policy", label: "Policy / civic action" },
  { slug: "audience", label: "Audience milestone" },
  { slug: "other", label: "Other" },
] as const;

export const ATTRIBUTION = {
  direct: { label: "Direct", hint: "Would not have happened without Frame" },
  contributed: { label: "Contributed", hint: "Frame materially helped" },
  unrelated: { label: "Unrelated", hint: "Would have happened anyway" },
  unknown: { label: "Unknown", hint: "Not yet assessed" },
} as const;

export const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  X: "X",
  LINKEDIN: "LinkedIn",
  SUBSTACK: "Substack",
  PODCAST: "Podcast",
  OTHER: "Other",
};

type Opt = { slug: string; label: string };
export const labelOf = (list: readonly Opt[], slug: string) => list.find((o) => o.slug === slug)?.label ?? slug;
