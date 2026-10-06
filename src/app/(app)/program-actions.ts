"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSelfOrTeam, requireTeam, getSession } from "@/lib/auth";
import type { Platform } from "@prisma/client";
import { FIELD_DEFS as FIELDS, type FieldKey } from "@/lib/fellow-fields";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { generatePassword, hashPassword, MIN_PASSWORD, verifyPassword } from "@/lib/password";

async function refresh(fellowId?: string) {
  revalidatePath("/fellows");
  revalidatePath("/opportunities");
  if (fellowId) {
    const f = await db.fellow.findUnique({ where: { id: fellowId }, select: { slug: true } });
    if (f) revalidatePath(`/fellows/${f.slug}`);
  }
}

const show = (v: unknown) => (v == null ? null : Array.isArray(v) ? v.join(", ") : String(v));

// Edits one profile/program field. Fellows may only edit fields marked `fellow: true`.
export async function updateFellowFieldAction(fellowId: string, field: FieldKey, raw: string) {
  const by = await requireSelfOrTeam(fellowId);
  const def = FIELDS[field];
  if (!def || (by === "fellow" && !def.fellow)) throw new Error("Not editable");
  const t = raw.trim();
  let value: string | number | string[] | null;
  if (def.type === "tags")
    value = [
      ...new Set(
        t
          .split(/[,\n]/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  else if (def.type === "number") {
    const n = t ? Number(t) : null;
    value = n != null && Number.isFinite(n) ? n : null;
    if (value != null && def.int) value = Math.round(value);
  } else if (def.type === "select") value = def.options?.some(([k]) => k === t) ? t : def.nullable === false ? def.options![0]![0] : null;
  else value = t || null;
  if (field === "slackUserId" && value) {
    const taken = await db.fellow.findFirst({ where: { slackUserId: value as string, NOT: { id: fellowId } }, select: { name: true } });
    if (taken) throw new Error(`Slack ID already assigned to ${taken.name}`);
  }
  const before = await db.fellow.findUniqueOrThrow({ where: { id: fellowId }, select: { [field]: true } });
  if (show(before[field as keyof typeof before]) === show(value)) return;
  await db.$transaction([
    db.fellow.update({ where: { id: fellowId }, data: { [field]: value } }),
    db.fellowEdit.create({ data: { fellowId, field, before: show(before[field as keyof typeof before]), after: show(value), by } }),
  ]);
  await refresh(fellowId);
}

export async function saveFellowFormAction(fellowId: string, formData: FormData) {
  for (const [k, v] of formData.entries()) {
    if (k in FIELDS) await updateFellowFieldAction(fellowId, k as FieldKey, String(v));
  }
}

// Per-week override of the cadence plan (team only).
export async function setCadenceWeekAction(fellowId: string, week: number, formData: FormData) {
  await requireTeam();
  const n = (k: string) => {
    const t = String(formData.get(k) ?? "").trim();
    return t === "" ? null : Math.max(0, Math.round(Number(t)));
  };
  const data = { long: n("long"), short: n("short"), note: String(formData.get("note") ?? "").trim() || null };
  if (data.long == null && data.short == null && !data.note) await db.cadenceWeek.deleteMany({ where: { fellowId, week } });
  else await db.cadenceWeek.upsert({ where: { fellowId_week: { fellowId, week } }, create: { fellowId, week, ...data }, update: data });
  await db.fellowEdit.create({ data: { fellowId, field: `cadence week ${week}`, after: `long ${data.long ?? "default"}, short ${data.short ?? "default"}`, by: "team" } });
  await refresh(fellowId);
}

// ---------- Resources (events, people, funding) ----------

export async function addResourceAction(formData: FormData) {
  const s = await getSession();
  if (s?.role !== "team" && s?.role !== "fellow") throw new Error("Not allowed");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const title = str("title");
  if (!title) return;
  const date = str("date");
  const r = await db.resource.create({
    data: {
      kind: str("kind") ?? "event",
      title,
      url: str("url"),
      date: date ? new Date(date) : null,
      location: str("location"),
      description: str("description"),
      tags: (str("tags") ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      source: s.role === "fellow" ? "fellow" : "manual",
    },
  });
  // A fellow adding an event is logging something they went to or want to go to.
  const fellowId = s.role === "fellow" ? s.fellowId! : str("fellowId");
  const status = str("status");
  if (fellowId && status) await db.fellowResource.create({ data: { fellowId, resourceId: r.id, status, by: s.role } });
  await refresh(fellowId ?? undefined);
}

export async function setResourceStatusAction(fellowId: string, resourceId: string, status: string) {
  const by = await requireSelfOrTeam(fellowId);
  if (status === "clear") await db.fellowResource.deleteMany({ where: { fellowId, resourceId } });
  else
    await db.fellowResource.upsert({
      where: { fellowId_resourceId: { fellowId, resourceId } },
      create: { fellowId, resourceId, status, by },
      update: { status, by },
    });
  await refresh(fellowId);
}

export async function deleteResourceAction(id: string) {
  await requireTeam();
  await db.resource.delete({ where: { id } });
  await refresh();
}

// ---------- Access ----------

// Invalidates the fellow's current sign-in link and sessions; a new link is shown in the fellows table on Home.
export async function rotateAccessAction(fellowId: string) {
  await requireTeam();
  await db.fellow.update({ where: { id: fellowId }, data: { accessVersion: { increment: 1 } } });
  await refresh(fellowId);
}

export async function toggleNoteSharedAction(id: string) {
  await requireTeam();
  const n = await db.fellowNote.findUniqueOrThrow({ where: { id }, select: { shared: true, fellowId: true } });
  await db.fellowNote.update({ where: { id }, data: { shared: !n.shared } });
  await refresh(n.fellowId);
}

export async function setCadenceWeekValueAction(fellowId: string, week: number, field: "long" | "short" | "note", raw: string) {
  await requireTeam();
  const cur = await db.cadenceWeek.findUnique({ where: { fellowId_week: { fellowId, week } } });
  const fd = new FormData();
  fd.set("long", cur?.long != null ? String(cur.long) : "");
  fd.set("short", cur?.short != null ? String(cur.short) : "");
  fd.set("note", cur?.note ?? "");
  fd.set(field, raw);
  await setCadenceWeekAction(fellowId, week, fd);
}

// Fellows can add or remove their own handles; each change is logged.
export async function addOwnAccountAction(fellowId: string, formData: FormData) {
  const by = await requireSelfOrTeam(fellowId);
  const platform = String(formData.get("platform") ?? "") as Platform;
  let handle = String(formData.get("handle") ?? "").trim();
  if (!(platform in PLATFORM_LABEL) || !handle) return;
  handle = handle.replace(/^https?:\/\/(www\.)?[^/]+\//, "").replace(/\/.*$/, "");
  if (["YOUTUBE", "TIKTOK", "INSTAGRAM", "X"].includes(platform)) handle = `@${handle.replace(/^@/, "")}`;
  handle = handle.toLowerCase();
  const existing = await db.account.findUnique({ where: { platform_handle: { platform, handle } }, select: { fellowId: true } });
  if (existing && existing.fellowId !== fellowId) throw new Error("That handle is already linked to another fellow");
  await db.account.upsert({ where: { platform_handle: { platform, handle } }, create: { fellowId, platform, handle, note: by === "fellow" ? "Added by fellow" : null }, update: {} });
  await db.fellowEdit.create({ data: { fellowId, field: "accounts", after: `added ${PLATFORM_LABEL[platform]} ${handle}`, by } });
  await refresh(fellowId);
}

export async function removeOwnAccountAction(fellowId: string, accountId: string) {
  const by = await requireSelfOrTeam(fellowId);
  const a = await db.account.findFirstOrThrow({ where: { id: accountId, fellowId }, include: { _count: { select: { posts: true } } } });
  // Removing an account deletes its scraped history, so only the team can do that.
  if (by === "fellow" && a._count.posts > 0) throw new Error("This account has tracked posts. Ask the Frame team to remove it.");
  await db.account.delete({ where: { id: a.id } });
  await db.fellowEdit.create({ data: { fellowId, field: "accounts", after: `removed ${PLATFORM_LABEL[a.platform]} ${a.handle}`, by } });
  await refresh(fellowId);
}

// ---------- Fellow passwords ----------

// Team: generate a new password for a fellow. Returned once so it can be
// shared; only the hash is stored. Signs the fellow out everywhere.
export async function generatePasswordAction(fellowId: string) {
  await requireTeam();
  const password = generatePassword();
  const f = await db.fellow.findUniqueOrThrow({ where: { id: fellowId }, select: { name: true, username: true } });
  const username = f.username ?? f.name.split(" ")[0]!.toLowerCase();
  await db.fellow.update({ where: { id: fellowId }, data: { username, passwordHash: await hashPassword(password), accessVersion: { increment: 1 } } });
  await db.fellowEdit.create({ data: { fellowId, field: "password", after: "reset by team", by: "team" } });
  await refresh(fellowId);
  return { username, password };
}

export async function setUsernameAction(fellowId: string, raw: string) {
  await requireTeam();
  const username = raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") || null;
  if (username) {
    const taken = await db.fellow.findFirst({ where: { username, NOT: { id: fellowId } }, select: { name: true } });
    if (taken) throw new Error(`Username taken by ${taken.name}`);
  }
  await db.fellow.update({ where: { id: fellowId }, data: { username } });
  await refresh(fellowId);
}

// Fellow: change their own password (needs the current one).
export async function changeOwnPasswordAction(_: string | undefined, formData: FormData) {
  const s = await getSession();
  if (s?.role !== "fellow") return "Only fellows can change their password here.";
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (next !== String(formData.get("confirm") ?? "")) return "The new passwords don't match.";
  const f = await db.fellow.findUniqueOrThrow({ where: { id: s.fellowId }, select: { passwordHash: true, accessVersion: true } });
  if (!(await verifyPassword(current, f.passwordHash))) return "Current password is incorrect.";
  // Keep this session valid (don't bump accessVersion); other devices stay signed in until they expire.
  await db.fellow.update({ where: { id: s.fellowId }, data: { passwordHash: await hashPassword(next) } });
  await db.fellowEdit.create({ data: { fellowId: s.fellowId!, field: "password", after: "changed by fellow", by: "fellow" } });
  return "saved";
}

// ---------- Progress checklist ----------

async function goalFellow(id: string) {
  return (await db.fellowGoal.findUniqueOrThrow({ where: { id }, select: { fellowId: true } })).fellowId;
}

export async function setGoalStatusAction(id: string, status: string) {
  await requireTeam();
  const g = await db.fellowGoal.update({ where: { id }, data: { status } });
  await db.fellowEdit.create({ data: { fellowId: g.fellowId, field: `checklist: ${g.title}`, after: status, by: "team" } });
  await refresh(g.fellowId);
}

export async function updateGoalAction(id: string, field: "title" | "note", raw: string) {
  await requireTeam();
  const v = raw.trim();
  if (field === "title" && !v) return;
  const g = await db.fellowGoal.update({ where: { id }, data: { [field]: v || null } });
  await refresh(g.fellowId);
}

export async function addGoalAction(fellowId: string, formData: FormData) {
  await requireTeam();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const last = await db.fellowGoal.findFirst({ where: { fellowId }, orderBy: { order: "desc" }, select: { order: true } });
  await db.fellowGoal.create({ data: { fellowId, title, area: String(formData.get("area") ?? "program"), order: (last?.order ?? 0) + 1 } });
  await refresh(fellowId);
}

export async function deleteGoalAction(id: string) {
  await requireTeam();
  const fellowId = await goalFellow(id);
  await db.fellowGoal.delete({ where: { id } });
  await refresh(fellowId);
}
