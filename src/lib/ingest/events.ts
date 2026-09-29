import type { PrismaClient } from "@prisma/client";

// Weekly event sourcing from Luma (Apify actor solidcode/luma-scraper).
// Keyword searches return lots of generic tech events, so only events that
// look AI-safety-relevant are kept, plus everything from the calendars listed
// in LUMA_CALENDARS (trusted sources: add org calendars there).

export const LUMA_ACTOR = "solidcode/luma-scraper";
export const LUMA_QUERIES = ["AI safety", "AI alignment", "AI policy", "AI governance", "interpretability", "effective altruism"];
// Luma calendar URLs whose events are always relevant (e.g. https://luma.com/<calendar>).
export const LUMA_CALENDARS: string[] = (process.env.LUMA_CALENDARS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function lumaInput(now = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    searchQueries: LUMA_QUERIES,
    discoverCity: "sf",
    lumaUrls: LUMA_CALENDARS,
    dateFrom: iso(now),
    dateTo: iso(new Date(now.getTime() + 60 * 86_400_000)),
    maxResults: 200,
    scrapeEventDetails: false,
  };
}

const RELEVANT = /\b(ai safety|safe ai|alignment|interpretab|mechanistic|x-?risk|existential|catastroph|ai (risk|policy|governance|ethics)|governance|policy|regulat|responsible ai|frontier (ai|research|model)|superintelligen|agi\b|effective altruis|\bea\b|rationalis|lesswrong|foresight|evals?\b|red.?team|misuse|deepfake|misinformation|ai (&|and) (society|democracy|jobs)|humane tech|pause ?ai|control ?ai)/i;

// Keyword → tag, so events line up with fellows' interests and content topics.
const TAGS: [RegExp, string][] = [
  [/interpretab|mechanistic/i, "interpretability"],
  [/alignment/i, "research-explainers"],
  [/policy|governance|regulat|legislat|congress/i, "governance-policy"],
  [/x-?risk|existential|catastroph|superintelligen/i, "x-risk"],
  [/evals?\b|red.?team|benchmark/i, "evals-demos"],
  [/deepfake|misinformation|disinformation|election/i, "info-integrity"],
  [/jobs|labor|workforce|economy/i, "jobs-economy"],
  [/creator|content|youtube|video|film|documentary|storytell|media/i, "media"],
  [/documentary|film/i, "documentary"],
  [/fund|grant|investor|philanthrop/i, "funding"],
  [/hackathon|hack day|build/i, "hackathon"],
  [/happy hour|social|dinner|mixer|party|meetup/i, "networking"],
  [/talk|panel|salon|lecture|reading group|paper/i, "talks"],
  [/robot|physical ai|humanoid/i, "physical ai & robotics"],
  [/protest|march|rally|teach-?in/i, "activism"],
];

type LumaItem = {
  eventId?: string;
  eventUrl?: string;
  name?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  sourceUrl?: string;
  location?: { name?: string; city?: string; isVirtual?: boolean };
  organizer?: { name?: string };
};

export async function ingestLumaEvents(db: PrismaClient, items: unknown[]) {
  let kept = 0;
  for (const e of items as LumaItem[]) {
    if (!e.eventId || !e.name) continue;
    const text = `${e.name} ${e.description ?? ""} ${e.organizer?.name ?? ""}`;
    const trusted = !!e.sourceUrl && LUMA_CALENDARS.some((c) => e.sourceUrl!.startsWith(c));
    if (!trusted && !RELEVANT.test(text)) continue;
    const tags = [...new Set(["event", ...TAGS.filter(([re]) => re.test(text)).map(([, t]) => t)])];
    const data = {
      kind: "event",
      title: e.name.slice(0, 200),
      url: e.eventUrl ?? null,
      date: e.startAt ? new Date(e.startAt) : null,
      endDate: e.endAt ? new Date(e.endAt) : null,
      location: e.location?.isVirtual ? "Online" : [e.location?.name, e.location?.city].filter(Boolean).join(", ") || null,
      description: [e.organizer?.name && `Hosted by ${e.organizer.name}.`, e.description?.slice(0, 280)].filter(Boolean).join(" ") || null,
      tags,
      source: "luma",
    };
    await db.resource.upsert({ where: { externalId: `luma:${e.eventId}` }, create: { externalId: `luma:${e.eventId}`, ...data }, update: data });
    kept++;
  }
  return { posts: 0, events: kept };
}
