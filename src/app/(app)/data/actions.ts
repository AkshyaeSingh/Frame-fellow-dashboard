"use server";

import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeam } from "@/lib/auth";
import { getRun } from "@/lib/apify";
import { startCommentScrape, startPostScrape, webhookUrl } from "@/lib/scrape";
import { fetchDataset, ingestItems } from "@/lib/ingest/store";
import { importRun } from "@/lib/ingest/run";
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
  const started = await startPostScrape(token, since, perAccount);
  if (formData.get("comments")) started.push(...(await startCommentScrape(token)));
  const webhook = webhookUrl();
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
      const rep = await importRun(db, r.platform, r.actor.includes("(events)") ? "events" : r.actor.includes("comments") ? "comments" : "posts", items);
      await db.scrapeRun.update({ where: { id: r.id }, data: { status: "IMPORTED", items: items.length, postsUpserted: rep.posts } });
    } else if (run.status !== r.status) {
      await db.scrapeRun.update({ where: { id: r.id }, data: { status: run.status } });
    }
  }
  revalidatePath("/", "layout");
}
