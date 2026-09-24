// Imports finished Apify datasets into the database.
//
//   npm run import:apify                         # everything listed in data/roster.ts APIFY_DATASETS
//   npm run import:apify -- YOUTUBE <datasetId>  # one dataset
//
// Datasets are fetched by ID (APIFY_TOKEN is used if set). Transcripts are
// downloaded from subtitle links where the scraper provided them.
import type { Platform } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { APIFY_DATASETS } from "../data/roster";
import { fetchDataset, ingestItems } from "../src/lib/ingest/store";

const db = new PrismaClient();

async function run(platform: Platform, datasetId: string, note?: string) {
  process.stdout.write(`${platform} ${datasetId} … `);
  const items = await fetchDataset(datasetId, process.env.APIFY_TOKEN || undefined);
  const r = await ingestItems(db, platform, items, { fetchTranscripts: true });
  await db.scrapeRun.upsert({
    where: { runId: datasetId },
    create: { runId: datasetId, datasetId, platform, actor: "import", status: "IMPORTED", items: items.length, postsUpserted: r.posts, note },
    update: { status: "IMPORTED", items: items.length, postsUpserted: r.posts },
  });
  console.log(`${items.length} items → ${r.accounts} accounts, ${r.posts} posts, ${r.transcripts} transcripts fetched`);
  if (r.unmatched.length) console.log(`   not in roster (skipped): ${r.unmatched.join(", ")}`);
}

async function main() {
  const [platform, datasetId] = process.argv.slice(2);
  if (platform && datasetId) return run(platform.toUpperCase() as Platform, datasetId);
  for (const d of APIFY_DATASETS) await run(d.platform, d.datasetId, d.note);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
