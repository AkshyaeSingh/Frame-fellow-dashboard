"use server";

import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeam } from "@/lib/auth";
import { ACTORS, IG_PROFILE_INPUT, getRun, startRun } from "@/lib/apify";
import { fetchDataset, ingestItems } from "@/lib/ingest/store";
import { PLATFORM_LABEL } from "@/lib/taxonomy";

export type Result = { ok?: string; error?: string } | undefined;

export async function importDatasetAction(_: Result, formData: FormData): Promise<Result> {
  await requireTeam();
  const platform = String(formData.get("platform")) as Platform;
  const datasetId = String(formData.get("datasetId") ?? "").trim();
  if (!(platform in PLATFORM_LABEL) || !datasetId) return { error: "Pick a platform and paste a dataset ID." };
  try {
    const items = await fetchDataset(datasetId, process.env.APIFY_TOKEN || undefined);
    const r = await ingestItems(db, platform, items, { fetchTranscripts: true });
    await db.scrapeRun.upsert({
      where: { runId: datasetId },
      create: { runId: datasetId, datasetId, platform, actor: "manual-import", status: "IMPORTED", items: items.length, postsUpserted: r.posts },
      update: { status: "IMPORTED", items: items.length, postsUpserted: r.posts },
    });
    revalidatePath("/", "layout");
    return { ok: `${items.length} items → ${r.posts} posts across ${r.accounts} accounts.${r.unmatched.length ? ` Not tracked: ${r.unmatched.join(", ")}` : ""}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed" };
  }
}

// Starts one Apify run per platform for all tracked accounts.
export async function startScrapeAction(_: Result, formData: FormData): Promise<Result> {
  await requireTeam();
  const token = process.env.APIFY_TOKEN;
  if (!token) return { error: "APIFY_TOKEN is not set in .env — add it, or use the import form with a dataset ID." };
  const since = String(formData.get("since") || new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10));
  const perAccount = Number(formData.get("perAccount") || 30);
  const webhook = process.env.PUBLIC_URL && process.env.WEBHOOK_SECRET ? `${process.env.PUBLIC_URL}/api/apify-webhook?token=${process.env.WEBHOOK_SECRET}` : undefined;
  const accounts = await db.account.findMany({ select: { platform: true, handle: true, url: true } });
  const started: string[] = [];
  for (const [platform, cfg] of Object.entries(ACTORS) as [Platform, NonNullable<(typeof ACTORS)[Platform]>][]) {
    const accts = accounts.filter((a) => a.platform === platform);
    if (!accts.length) continue;
    const run = await startRun(token, cfg.actor, cfg.input(accts, since, perAccount), webhook, platform);
    await db.scrapeRun.create({ data: { runId: run.id, datasetId: run.defaultDatasetId, platform, actor: cfg.actor, status: run.status } });
    started.push(`${PLATFORM_LABEL[platform]} (${accts.length})`);
    if (platform === "INSTAGRAM") {
      const p = await startRun(token, cfg.actor, IG_PROFILE_INPUT(accts), webhook, platform);
      await db.scrapeRun.create({ data: { runId: p.id, datasetId: p.defaultDatasetId, platform, actor: `${cfg.actor} (profiles)`, status: p.status } });
    }
  }
  revalidatePath("/data");
  return { ok: `Started: ${started.join(", ")}. Use “Check & import” when they finish${webhook ? " (or the webhook will import automatically)" : ""}.` };
}

export async function syncRunsAction(): Promise<void> {
  await requireTeam();
  const token = process.env.APIFY_TOKEN;
  if (!token) return;
  const pending = await db.scrapeRun.findMany({ where: { status: { in: ["READY", "RUNNING"] } } });
  for (const r of pending) {
    const run = await getRun(token, r.runId);
    if (run.status === "SUCCEEDED") {
      const items = await fetchDataset(r.datasetId, token);
      const rep = await ingestItems(db, r.platform, items, { fetchTranscripts: true });
      await db.scrapeRun.update({ where: { id: r.id }, data: { status: "IMPORTED", items: items.length, postsUpserted: rep.posts } });
    } else if (run.status !== r.status) {
      await db.scrapeRun.update({ where: { id: r.id }, data: { status: run.status } });
    }
  }
  revalidatePath("/", "layout");
}
