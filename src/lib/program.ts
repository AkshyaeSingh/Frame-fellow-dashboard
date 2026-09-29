import type { Platform } from "@prisma/client";

// Cadence tracking: what each fellow planned to publish per week vs what the
// scrapers actually found. Week 1 starts on the fellowship start date.
//
// Formats:
//   long    YouTube videos ≥ 3 min, podcasts
//   short   Shorts, TikToks, Reels, carousels, short YouTube uploads
//   written X, LinkedIn, Substack (shown, but not counted against video targets)

const DAY = 86_400_000;
const LONG_MIN_SEC = 180;

export type Format = "long" | "short" | "written";

export type CadencePost = { platform: Platform; kind: string | null; durationSec: number | null; publishedAt: Date | null; isAiSafety: boolean };

export function formatOf(p: Pick<CadencePost, "platform" | "kind" | "durationSec">): Format {
  if (p.platform === "PODCAST") return "long";
  if (p.platform === "YOUTUBE") return p.kind === "video" && (p.durationSec ?? 0) >= LONG_MIN_SEC ? "long" : "short";
  if (p.platform === "TIKTOK" || p.platform === "INSTAGRAM") return "short";
  return "written";
}

export type Plan = {
  longPerWeek: number | null;
  shortPerWeek: number | null;
  programLong: number | null;
  programShort: number | null;
  cadenceScope: string;
  weeks: { week: number; long: number | null; short: number | null; note: string | null }[];
};

export type Health = "on-track" | "behind" | "off-track" | "no-plan" | "not-started" | "done";
export const HEALTH_LABEL: Record<Health | "needs-help" | "paused", string> = {
  "on-track": "On track",
  behind: "Behind",
  "off-track": "Off track",
  "no-plan": "No plan yet",
  "not-started": "Not started",
  done: "Finished",
  "needs-help": "Needs help",
  paused: "Paused",
};

export function programWeeks(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime() + DAY) / (7 * DAY)));
}

export function weekOf(d: Date, start: Date) {
  return Math.floor((d.getTime() - start.getTime()) / (7 * DAY)) + 1;
}

export function cadence(plan: Plan, posts: CadencePost[], start: Date, end: Date, now = new Date()) {
  const n = programWeeks(start, end);
  const counted = posts.filter((p) => p.publishedAt && (plan.cadenceScope !== "ai-safety" || p.isAiSafety));
  const override = new Map(plan.weeks.map((w) => [w.week, w]));
  // Weekly target: explicit override, else the per-week plan, else spread the program total evenly.
  const target = (week: number, f: "long" | "short") => {
    const o = override.get(week)?.[f];
    if (o != null) return o;
    const per = f === "long" ? plan.longPerWeek : plan.shortPerWeek;
    if (per != null) return per;
    const total = f === "long" ? plan.programLong : plan.programShort;
    return total != null ? total / n : null;
  };
  const current = Math.min(n + 1, Math.max(0, weekOf(now, start)));
  const weeks = Array.from({ length: n }, (_, i) => {
    const week = i + 1;
    const from = new Date(start.getTime() + i * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const ps = counted.filter((p) => p.publishedAt! >= from && p.publishedAt! < to);
    const count = (f: Format) => ps.filter((p) => formatOf(p) === f).length;
    return {
      week,
      from,
      to,
      status: week < current ? ("past" as const) : week === current ? ("current" as const) : ("future" as const),
      long: { target: target(week, "long"), actual: count("long") },
      short: { target: target(week, "short"), actual: count("short") },
      written: count("written"),
      note: override.get(week)?.note ?? null,
    };
  });

  // Expected to date: full targets for past weeks + the elapsed share of this week.
  const elapsedFrac = current >= 1 && current <= n ? Math.min(1, (now.getTime() - weeks[current - 1]!.from.getTime()) / (7 * DAY)) : 0;
  const sumTo = (f: "long" | "short") => {
    let expected = 0;
    let any = false;
    for (const w of weeks) {
      const t = w[f].target;
      if (t == null) continue;
      any = true;
      if (w.status === "past") expected += t;
      else if (w.status === "current") expected += t * elapsedFrac;
    }
    const actual = weeks.filter((w) => w.status !== "future").reduce((s, w) => s + w[f].actual, 0);
    const programTarget = (f === "long" ? plan.programLong : plan.programShort) ?? (any ? weeks.reduce((s, w) => s + (w[f].target ?? 0), 0) : null);
    return { expected: any ? expected : null, actual, programTarget };
  };
  const toDate = { long: sumTo("long"), short: sumTo("short") };

  // Pace compares actual to expected across the formats that have a plan.
  // Long-form is weighted ×4, since one long video is worth several shorts in effort.
  const planned = (["long", "short"] as const).filter((f) => toDate[f].expected != null);
  let health: Health;
  let pace: number | null = null;
  if (current < 1) health = "not-started";
  else if (!planned.length) health = "no-plan";
  else {
    const w = (f: "long" | "short") => (f === "long" ? 4 : 1);
    const exp = planned.reduce((s, f) => s + toDate[f].expected! * w(f), 0);
    const act = planned.reduce((s, f) => s + toDate[f].actual * w(f), 0);
    pace = exp > 0 ? act / exp : null;
    health = pace == null ? "on-track" : pace >= 0.8 ? "on-track" : pace >= 0.5 ? "behind" : "off-track";
    if (current > n && health === "on-track") health = "done";
  }
  const thisWeek = current >= 1 && current <= n ? weeks[current - 1]! : null;
  return { weeks, currentWeek: current, totalWeeks: n, toDate, pace, health, thisWeek };
}

export type Cadence = ReturnType<typeof cadence>;

// "1.5/wk" or "–"
export function perWeek(v: number | null | undefined) {
  if (v == null) return "–";
  return `${Number.isInteger(v) ? v : v.toFixed(1)}/wk`;
}

export function fmtTarget(v: number | null) {
  if (v == null) return "–";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
