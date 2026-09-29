import "server-only";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { ACTORS, COMMENT_ACTORS, IG_PROFILE_INPUT, startRun } from "@/lib/apify";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { LUMA_ACTOR, lumaInput } from "@/lib/ingest/events";

// Shared by the "Start scrape" button and the weekly cron. Runs report back
// to /api/apify-webhook, which imports them — no polling needed.

export function webhookUrl() {
  const { PUBLIC_URL, WEBHOOK_SECRET } = process.env;
  return PUBLIC_URL && WEBHOOK_SECRET ? `${PUBLIC_URL.replace(/\/$/, "")}/api/apify-webhook?token=${WEBHOOK_SECRET}` : undefined;
}

export async function startPostScrape(token: string, since: string, perAccount: number) {
  const hook = webhookUrl();
  const accounts = await db.account.findMany({ select: { platform: true, handle: true, url: true } });
  const started: string[] = [];
  for (const [platform, cfg] of Object.entries(ACTORS) as [Platform, NonNullable<(typeof ACTORS)[Platform]>][]) {
    const accts = accounts.filter((a) => a.platform === platform);
    if (!accts.length) continue;
    const run = await startRun(token, cfg.actor, cfg.input(accts, since, perAccount), hook, platform);
    await db.scrapeRun.create({ data: { runId: run.id, datasetId: run.defaultDatasetId, platform, actor: cfg.actor, status: run.status } });
    started.push(`${PLATFORM_LABEL[platform]} (${accts.length})`);
    if (platform === "INSTAGRAM") {
      const p = await startRun(token, cfg.actor, IG_PROFILE_INPUT(accts), hook, platform);
      await db.scrapeRun.create({ data: { runId: p.id, datasetId: p.defaultDatasetId, platform, actor: `${cfg.actor} (profiles)`, status: p.status } });
    }
  }
  return started;
}

// Comments for recent posts that haven't been read in the last week. Instagram
// comments arrive with the post scrape (latestComments), so only YouTube and
// TikTok need their own runs.
export async function startCommentScrape(token: string, { days = 30, maxPosts = 120 } = {}) {
  const hook = webhookUrl();
  const since = new Date(Date.now() - days * 86_400_000);
  const stale = new Date(Date.now() - 6 * 86_400_000);
  const started: string[] = [];
  for (const [platform, cfg] of Object.entries(COMMENT_ACTORS) as [Platform, NonNullable<(typeof COMMENT_ACTORS)[Platform]>][]) {
    const posts = await db.post.findMany({
      where: { platform, publishedAt: { gte: since }, url: { not: null }, comments: { gt: 0 }, OR: [{ commentsScrapedAt: null }, { commentsScrapedAt: { lt: stale } }] },
      orderBy: { publishedAt: "desc" },
      take: maxPosts,
      select: { url: true },
    });
    if (!posts.length) continue;
    const run = await startRun(token, cfg.actor, cfg.input(posts.map((p) => p.url!)), hook, platform, "comments");
    await db.scrapeRun.create({ data: { runId: run.id, datasetId: run.defaultDatasetId, platform, actor: `${cfg.actor}`, status: run.status } });
    started.push(`${PLATFORM_LABEL[platform]} comments (${posts.length} posts)`);
  }
  return started;
}

// Upcoming AI-safety events from Luma, filtered and tagged on import.
export async function startEventScrape(token: string) {
  const run = await startRun(token, LUMA_ACTOR, lumaInput(), webhookUrl(), "OTHER", "events");
  await db.scrapeRun.create({ data: { runId: run.id, datasetId: run.defaultDatasetId, platform: "OTHER", actor: `${LUMA_ACTOR} (events)`, status: run.status } });
  return ["Luma events"];
}
