// Imports comments into the Comment table.
//
//   npm run import:comments -- YOUTUBE <datasetId>   # a comments dataset from Apify
//   npm run import:comments -- --from-posts           # Instagram `latestComments` already stored on posts (free)
//   npm run import:comments -- --reanalyze            # re-run the rule-based tagger after editing lib/analysis/comments.ts
import type { Platform } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { analyzeComment } from "../src/lib/analysis/comments";
import { normalizeComments, storeComments } from "../src/lib/ingest/comments";
import { fetchDataset } from "../src/lib/ingest/store";

const db = new PrismaClient();

async function main() {
  const [a, b] = process.argv.slice(2);
  if (a === "--from-posts") {
    const posts = await db.post.findMany({ where: { platform: "INSTAGRAM" }, select: { externalId: true, raw: true } });
    const items = posts.flatMap((p) =>
      (((p.raw as { latestComments?: Record<string, unknown>[] } | null)?.latestComments ?? []) as Record<string, unknown>[]).map((c) => ({
        ...c,
        postUrl: `https://www.instagram.com/p/${p.externalId}/`,
      })),
    );
    const r = await storeComments(db, "INSTAGRAM", normalizeComments("INSTAGRAM", items));
    console.log(`Instagram latestComments: ${r.stored} comments on ${r.posts} posts`);
    return;
  }
  if (a === "--reanalyze") {
    const all = await db.comment.findMany({ where: { isCreator: false }, select: { id: true, text: true } });
    for (const c of all) {
      const r = analyzeComment(c.text);
      await db.comment.update({ where: { id: c.id }, data: { sentiment: r.sentiment, signals: r.signals, analyzedBy: "rules-v1" } });
    }
    console.log(`Re-analyzed ${all.length} comments`);
    return;
  }
  if (!a || !b) throw new Error("Usage: import-comments <PLATFORM> <datasetId> | --from-posts | --reanalyze");
  const platform = a.toUpperCase() as Platform;
  const items = await fetchDataset(b, process.env.APIFY_TOKEN || undefined);
  const r = await storeComments(db, platform, normalizeComments(platform, items as Record<string, unknown>[]));
  console.log(`${platform} ${b}: ${items.length} items → ${r.stored} comments on ${r.posts} posts (${r.unmatched} unmatched)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
