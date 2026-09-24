// Re-runs the rule-based tagger over every post (e.g. after editing
// src/lib/taxonomy.ts). Posts with an LLM analysis are left alone.
//   npm run analyze
import { PrismaClient } from "@prisma/client";
import { analyzeRules } from "../src/lib/analysis/rules";

const db = new PrismaClient();

async function main() {
  const posts = await db.post.findMany({
    where: { OR: [{ analyzedBy: null }, { analyzedBy: "rules-v1" }] },
    select: { id: true, title: true, caption: true, transcript: true, hashtags: true, links: true, isSponsored: true },
  });
  for (const p of posts) {
    const r = analyzeRules(p);
    await db.post.update({
      where: { id: p.id },
      data: {
        topics: r.topics,
        ctas: r.ctas,
        orgsMentioned: r.orgsMentioned,
        aiSafetyScore: r.aiSafetyScore,
        isAiSafety: r.isAiSafety,
        isSponsored: p.isSponsored || r.isSponsored,
        analysis: { rules: r.matches },
        analyzedAt: new Date(),
        analyzedBy: "rules-v1",
      },
    });
  }
  console.log(`Re-tagged ${posts.length} posts.`);
}

main().finally(() => db.$disconnect());
