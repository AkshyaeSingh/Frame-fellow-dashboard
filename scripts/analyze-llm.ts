// LLM analysis pass: topics, framing, calls to action, orgs promoted, and a
// claim-by-claim accuracy check of the transcript against data/ground-truth.md.
//
//   npm run analyze:llm -- [--fellow <slug>] [--limit 50] [--force] [--all]
//
// By default only posts with a transcript (or a long caption) that haven't been
// LLM-analyzed yet are processed. Needs ANTHROPIC_API_KEY (or an `ant auth login` profile).
import { readFileSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { CTAS, FRAMINGS, ORGS, TOPICS } from "../src/lib/taxonomy";

const db = new PrismaClient();
const client = new Anthropic();
const MODEL = "claude-opus-5";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const slugs = <T extends readonly { slug: string }[]>(xs: T) => xs.map((x) => x.slug) as [string, ...string[]];

const Analysis = z.object({
  summary: z.string().describe("One or two sentences: what the piece says and to whom."),
  isAiSafety: z.boolean().describe("Is the piece substantively about AI safety, AI risk or AI governance (not just AI tools/news)?"),
  aiSafetyScore: z.number().describe("0 to 1 relevance to AI safety / governance."),
  topics: z.array(z.enum(slugs(TOPICS))),
  framing: z.enum(slugs(FRAMINGS)),
  ctas: z.array(z.enum(slugs(CTAS))).describe("Calls to action the creator actually makes."),
  ctaText: z.array(z.string()).describe("The exact wording of each call to action, short."),
  orgsMentioned: z.array(z.enum(slugs(ORGS))).describe("Organizations promoted or cited."),
  otherPromotions: z.array(z.string()).describe("Anything else promoted: sponsors, products, other causes, own products."),
  audience: z.string().describe("Who this seems made for, in a few words."),
  claims: z
    .array(
      z.object({
        claim: z.string().describe("A specific factual claim made in the piece, paraphrased."),
        verdict: z.enum(["supported", "contested", "unsupported", "misleading", "unverifiable"]),
        note: z.string().describe("Why — cite the ground-truth bullet when used."),
      }),
    )
    .describe("Up to 6 of the most consequential factual claims. Empty if there are none."),
});

const GROUND_TRUTH = readFileSync(path.join(process.cwd(), "data/ground-truth.md"), "utf8");

// Stable system prompt (cached) — the ground-truth file and instructions.
const SYSTEM = `You analyze social media content made by creators in the Frame Fellowship, a program for AI safety communicators. The Frame team uses your output to understand what each fellow covers, what they ask their audience to do, and whether their factual claims are accurate. Be precise and fair: creators simplify, and simplification is fine unless it changes the meaning.

When checking claims, rely on the ground-truth reference below first. For claims it doesn't cover, use well-established public knowledge only when you are confident; otherwise mark the claim "unverifiable". Opinions, predictions and value judgments are not factual claims — skip them. Mark "misleading" when a claim is technically true but framed to imply something false (for example presenting a constructed evaluation as real-world behavior).

<ground_truth>
${GROUND_TRUTH}
</ground_truth>`;

async function main() {
  const fellowSlug = opt("fellow");
  const limit = Number(opt("limit") ?? 100);
  const posts = await db.post.findMany({
    where: {
      ...(fellowSlug && { fellow: { slug: fellowSlug } }),
      ...(!flag("force") && { OR: [{ analyzedBy: null }, { analyzedBy: "rules-v1" }] }),
      ...(!flag("all") && { OR: [{ transcript: { not: null } }, { caption: { not: null } }] }),
    },
    orderBy: [{ isAiSafety: "desc" }, { views: { sort: "desc", nulls: "last" } }],
    take: limit,
    include: { fellow: { select: { name: true } } },
  });
  const usable = posts.filter((p) => (p.transcript?.length ?? 0) > 200 || (p.caption?.length ?? 0) > 150 || (p.title?.length ?? 0) > 20);
  console.log(`Analyzing ${usable.length} posts with ${MODEL}…`);

  let done = 0;
  let refused = 0;
  for (const p of usable) {
    const content = [
      `Creator: ${p.fellow.name}`,
      `Platform: ${p.platform}${p.kind ? ` (${p.kind})` : ""}`,
      p.publishedAt && `Published: ${p.publishedAt.toISOString().slice(0, 10)}`,
      p.title && `Title: ${p.title}`,
      p.caption && `Caption/description:\n${p.caption}`,
      p.links.length ? `Links: ${p.links.join(", ")}` : null,
      p.transcript ? `Transcript:\n${p.transcript}` : "No transcript available — judge from the text above.",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: betaZodOutputFormat(Analysis) },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
      });
      if (res.stop_reason === "refusal" || !res.parsed_output) {
        refused++;
        console.warn(`  skipped ${p.url} (${res.stop_reason})`);
        continue;
      }
      const a = res.parsed_output;
      await db.post.update({
        where: { id: p.id },
        data: {
          isAiSafety: a.isAiSafety,
          aiSafetyScore: Math.max(0, Math.min(1, a.aiSafetyScore)),
          topics: a.topics,
          framing: a.framing,
          ctas: a.ctas,
          orgsMentioned: a.orgsMentioned,
          analysis: { summary: a.summary, ctaText: a.ctaText, otherPromotions: a.otherPromotions, audience: a.audience, claims: a.claims, model: res.model },
          analyzedAt: new Date(),
          analyzedBy: res.model,
        },
      });
      done++;
      if (done % 10 === 0) console.log(`  ${done}/${usable.length}`);
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) {
        console.warn("  rate limited — waiting 30s");
        await new Promise((r) => setTimeout(r, 30_000));
      } else if (e instanceof Anthropic.APIError) {
        console.error(`  API error ${e.status} on ${p.url}: ${e.message}`);
      } else {
        throw e;
      }
    }
  }
  console.log(`Done: ${done} analyzed, ${refused} skipped.`);
}

main().finally(() => db.$disconnect());
