import { CTAS, ORGS, TOPICS } from "../taxonomy";

// Rule-based first pass over a post. Cheap, deterministic and explainable —
// every tag can be traced back to the matched term. The LLM pass
// (scripts/analyze-llm.ts) refines these where a transcript is available.

export type RuleInput = {
  title?: string | null;
  caption?: string | null;
  transcript?: string | null;
  hashtags?: string[];
  links?: string[];
};

export type RuleOutput = {
  topics: string[];
  ctas: string[];
  orgsMentioned: string[];
  aiSafetyScore: number;
  isAiSafety: boolean;
  isSponsored: boolean;
  matches: Record<string, string[]>; // slug -> terms that matched (for auditability)
};

// Topics that count as "AI safety" (vs general AI/culture content).
const SAFETY_TOPICS = new Set([
  "x-risk",
  "evals-demos",
  "lab-accountability",
  "governance-policy",
  "race-dynamics",
  "jobs-economy",
  "kids-chatbots",
  "info-integrity",
  "research-explainers",
  "careers-field",
  "activism",
]);

const SPONSOR_TERMS = ["#ad", "#sponsored", "sponsored by", "paid partnership", "use code", "affiliate", "thanks to our sponsor", "in partnership with"];

function norm(s: string) {
  return ` ${s.toLowerCase().replace(/\s+/g, " ")} `;
}

function find(text: string, terms: readonly string[]) {
  return terms.filter((t) => text.includes(t.toLowerCase()));
}

export function analyzeRules(input: RuleInput): RuleOutput {
  const head = norm([input.title, input.caption, ...(input.hashtags ?? []).map((h) => `#${h}`), ...(input.links ?? [])].filter(Boolean).join(" \n "));
  const body = input.transcript ? norm(input.transcript) : "";
  const all = head + body;
  const matches: Record<string, string[]> = {};

  const topics: string[] = [];
  for (const t of TOPICS) {
    const m = find(all, t.terms);
    if (m.length) {
      topics.push(t.slug);
      matches[`topic:${t.slug}`] = m;
    }
  }

  const ctas: string[] = [];
  for (const c of CTAS) {
    // CTAs are about what the creator asks — check caption/title/links and transcript.
    const m = find(all, c.terms);
    if (m.length) {
      ctas.push(c.slug);
      matches[`cta:${c.slug}`] = m;
    }
  }

  const orgsMentioned: string[] = [];
  for (const o of ORGS) {
    const m = find(all, o.terms);
    if (m.length) {
      orgsMentioned.push(o.slug);
      matches[`org:${o.slug}`] = m;
    }
  }

  // Relevance: weight safety topics by how many distinct terms matched, with
  // a boost when the match is in the title/caption (what the post is "about").
  let score = 0;
  for (const t of topics) {
    if (!SAFETY_TOPICS.has(t)) continue;
    const hits = matches[`topic:${t}`]!.length;
    const inHead = TOPICS.find((x) => x.slug === t)!.terms.some((term) => head.includes(term));
    score += Math.min(0.35, 0.12 * hits) + (inHead ? 0.15 : 0);
  }
  if (orgsMentioned.some((o) => o !== "frame")) score += 0.1;
  const aiSafetyScore = Math.min(1, Math.round(score * 100) / 100);

  const isSponsored = SPONSOR_TERMS.some((t) => head.includes(t));

  return {
    topics,
    ctas,
    orgsMentioned,
    aiSafetyScore,
    isAiSafety: aiSafetyScore >= 0.3,
    isSponsored,
    matches,
  };
}
