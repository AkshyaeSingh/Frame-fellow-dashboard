import { NextResponse, type NextRequest } from "next/server";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchDataset } from "@/lib/ingest/store";
import { importRun } from "@/lib/ingest/run";
import { PLATFORM_LABEL } from "@/lib/taxonomy";

// Drop-in replacement for Frame-Agent's /api/apify-webhook, writing to Postgres.
// Apify webhook: event "Run succeeded", URL …/api/apify-webhook?token=WEBHOOK_SECRET,
// payload {"platform": "instagram", "resource": {{resource}}}.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.nextUrl.searchParams.get("token") !== secret) return new NextResponse("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { platform?: string; kind?: string; resource?: { status?: string; defaultDatasetId?: string; id?: string; actId?: string } };
  const platform = String(body.platform ?? "").toUpperCase() as Platform;
  if (!(platform in PLATFORM_LABEL)) return new NextResponse(`unknown platform: ${body.platform}`, { status: 400 });
  const res = body.resource ?? {};
  if (res.status !== "SUCCEEDED") return new NextResponse("run did not succeed, nothing to ingest");
  if (!res.defaultDatasetId) return new NextResponse("missing defaultDatasetId", { status: 400 });

  const items = await fetchDataset(res.defaultDatasetId, process.env.APIFY_TOKEN || undefined);
  const kind = body.kind === "comments" ? "comments" : "posts";
  const r = await importRun(db, platform, kind, items);
  await db.scrapeRun.upsert({
    where: { runId: res.id ?? res.defaultDatasetId },
    create: { runId: res.id ?? res.defaultDatasetId, datasetId: res.defaultDatasetId, platform, actor: res.actId ?? `webhook ${kind}`, status: "IMPORTED", items: items.length, postsUpserted: r.posts },
    update: { status: "IMPORTED", items: items.length, postsUpserted: r.posts },
  });
  return NextResponse.json({ ok: true, ...r });
}
