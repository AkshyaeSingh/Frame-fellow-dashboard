"use server";

import { revalidatePath } from "next/cache";
import type { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { requireTeam } from "@/lib/auth";
import { PLATFORM_LABEL } from "@/lib/taxonomy";

const s = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t || null;
};
const n = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const x = Number(t.replace(/[,%]/g, ""));
  return Number.isFinite(x) ? Math.round(x) : null;
};
const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

async function refresh(fellowId: string) {
  const f = await db.fellow.findUnique({ where: { id: fellowId }, select: { slug: true } });
  revalidatePath("/");
  if (f) revalidatePath(`/fellows/${f.slug}`);
}

// ---------- Outcomes ----------

export async function addOutcomeAction(fellowId: string, formData: FormData) {
  await requireTeam();
  const title = s(formData.get("title"));
  if (!title) return;
  const date = s(formData.get("date"));
  await db.outcome.create({
    data: {
      fellowId,
      title,
      type: s(formData.get("type")) ?? "other",
      date: date ? new Date(date) : null,
      url: s(formData.get("url")),
      detail: s(formData.get("detail")),
      attribution: s(formData.get("attribution")) ?? "unknown",
      evidence: s(formData.get("evidence")),
      source: "manual",
    },
  });
  await refresh(fellowId);
}

export async function updateOutcomeAction(id: string, formData: FormData) {
  await requireTeam();
  const o = await db.outcome.update({
    where: { id },
    data: { attribution: s(formData.get("attribution")) ?? "unknown", evidence: s(formData.get("evidence")), type: s(formData.get("type")) ?? undefined },
  });
  await refresh(o.fellowId);
}

export async function deleteOutcomeAction(id: string) {
  await requireTeam();
  const o = await db.outcome.delete({ where: { id } });
  await refresh(o.fellowId);
}

// ---------- Trudy reports ----------
// Trudy has no API we can use, so reports are entered from the Trudy UI.

export async function addTrudyAction(fellowId: string, formData: FormData) {
  await requireTeam();
  const against = s(formData.get("against"));
  if (!against) return;
  const pctN = (k: string) => {
    const t = s(formData.get(k));
    return t ? Number(t.replace("%", "")) : null;
  };
  const platform = s(formData.get("platform"));
  const date = s(formData.get("reportDate"));
  const countries = lines(formData.get("countries"))
    .map((l) => l.match(/^([A-Z]{2})\s+([\d.]+)/i))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ code: m[1]!.toUpperCase(), pct: Number(m[2]) }));
  const age = Object.fromEntries(
    lines(formData.get("age"))
      .map((l) => l.match(/^([\d+–-]+)\s+([\d.]+)/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1]!, Number(m[2])]),
  );
  await db.trudyReport.create({
    data: {
      fellowId,
      against,
      againstCategory: s(formData.get("againstCategory")),
      platform: platform && platform in PLATFORM_LABEL ? (platform as Platform) : null,
      reportDate: date ? new Date(date) : new Date(),
      score: n(formData.get("score")),
      contentFit: n(formData.get("contentFit")),
      audienceFit: n(formData.get("audienceFit")),
      persuasionFit: n(formData.get("persuasionFit")),
      insights: lines(formData.get("insights")),
      contentNotes: lines(formData.get("contentNotes")),
      audienceNotes: lines(formData.get("audienceNotes")),
      persuasionNotes: lines(formData.get("persuasionNotes")),
      contentSummary: s(formData.get("contentSummary")),
      demographics: {
        male: pctN("male"),
        female: pctN("female"),
        age: Object.keys(age).length ? age : null,
        countries: countries.length ? countries : null,
      },
      metrics: { followers: n(formData.get("followers")), avgViews: n(formData.get("avgViews")), engagementRate: pctN("engagementRate") },
      brandSafety: { contentStyle: s(formData.get("contentStyle")), controversialTopics: s(formData.get("controversialTopics")) },
      expectedViews: n(formData.get("expectedViews")),
      estConversions: n(formData.get("estConversions")),
      conversionRate: pctN("conversionRate"),
    },
  });
  await refresh(fellowId);
}

export async function deleteTrudyAction(id: string) {
  await requireTeam();
  const t = await db.trudyReport.delete({ where: { id } });
  await refresh(t.fellowId);
}

// ---------- Accounts ----------

export async function addAccountAction(fellowId: string, formData: FormData) {
  await requireTeam();
  const platform = s(formData.get("platform")) as Platform | null;
  let handle = s(formData.get("handle"));
  if (!platform || !handle || !(platform in PLATFORM_LABEL)) return;
  if (["YOUTUBE", "TIKTOK", "INSTAGRAM", "X"].includes(platform)) handle = `@${handle.replace(/^@/, "")}`;
  handle = handle.toLowerCase();
  await db.account.upsert({
    where: { platform_handle: { platform, handle } },
    create: { fellowId, platform, handle, url: s(formData.get("url")), note: s(formData.get("note")) },
    update: { fellowId, url: s(formData.get("url")) ?? undefined, note: s(formData.get("note")) ?? undefined },
  });
  await refresh(fellowId);
}

export async function removeAccountAction(id: string) {
  await requireTeam();
  const a = await db.account.delete({ where: { id } });
  await refresh(a.fellowId);
}

export async function saveNotesAction(fellowId: string, formData: FormData) {
  await requireTeam();
  await db.fellow.update({ where: { id: fellowId }, data: { notes: s(formData.get("notes")) } });
  await refresh(fellowId);
}
