import type { Platform, PrismaClient } from "@prisma/client";
import { normalizeComments, storeComments } from "./comments";
import { ingestItems } from "./store";

// Imports a finished Apify run: posts (plus Instagram's inline latestComments) or a comments dataset.
export async function importRun(db: PrismaClient, platform: Platform, kind: "posts" | "comments", items: unknown[]) {
  if (kind === "comments") {
    const r = await storeComments(db, platform, normalizeComments(platform, items as Record<string, unknown>[]));
    return { posts: 0, comments: r.stored };
  }
  const r = await ingestItems(db, platform, items, { fetchTranscripts: true });
  let comments = 0;
  if (platform === "INSTAGRAM") {
    const inline = (items as Record<string, unknown>[]).flatMap((p) =>
      ((p.latestComments as Record<string, unknown>[] | undefined) ?? []).map((c) => ({ ...c, postUrl: p.url ?? `https://www.instagram.com/p/${p.shortCode}/` })),
    );
    if (inline.length) comments = (await storeComments(db, platform, normalizeComments(platform, inline))).stored;
  }
  return { ...r, comments };
}
