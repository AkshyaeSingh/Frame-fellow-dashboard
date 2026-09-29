// Imports finished Apify datasets (posts, or comments with --comments), same path as the webhook.
//   npm run import:run -- YOUTUBE <datasetId> [INSTAGRAM <datasetId> …] [--comments | --events]
import type { Platform } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { importRun } from "../src/lib/ingest/run";
import { fetchDataset } from "../src/lib/ingest/store";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const kind = process.argv.includes("--comments") ? "comments" : process.argv.includes("--events") ? "events" : "posts";
  for (let i = 0; i + 1 < args.length; i += 2) {
    const platform = args[i]!.toUpperCase() as Platform;
    const items = await fetchDataset(args[i + 1]!, process.env.APIFY_TOKEN || undefined);
    const r = await importRun(db, platform, kind, items);
    console.log(platform, args[i + 1], `${items.length} items →`, JSON.stringify(r));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
