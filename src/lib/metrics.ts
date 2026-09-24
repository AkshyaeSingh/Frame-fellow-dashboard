import type { Platform } from "@prisma/client";

// Before / during / after comparisons — the core of the counterfactual story.
//
//   baseline = the 90 days before the fellowship started
//   during   = the fellowship window
//   after    = from the end of the fellowship to today (capped at 90 days)
//
// Views accumulate over time, so older posts have had longer to collect
// them. Medians and per-week rates are used to keep windows comparable, and
// the UI labels "after" as still maturing when it's recent.

export type Window = "baseline" | "during" | "after";
export const WINDOW_LABEL: Record<Window, string> = { baseline: "90 days before", during: "During fellowship", after: "After" };
const DAY = 86_400_000;
const BASELINE_DAYS = 90;
const AFTER_CAP_DAYS = 90;

export type PostLike = {
  platform: Platform;
  publishedAt: Date | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  durationSec: number | null;
  isAiSafety: boolean;
  aiSafetyScore: number | null;
  ctas: string[];
  topics: string[];
  orgsMentioned: string[];
  kind: string | null;
};

export function windowsFor(start: Date, end: Date, now = new Date()) {
  const baselineStart = new Date(start.getTime() - BASELINE_DAYS * DAY);
  const afterEnd = new Date(Math.min(now.getTime(), end.getTime() + AFTER_CAP_DAYS * DAY));
  return {
    baseline: { from: baselineStart, to: start },
    during: { from: start, to: end > now ? now : end },
    after: end < now ? { from: end, to: afterEnd } : null,
  };
}

export function windowOf(d: Date | null, start: Date, end: Date): Window | "earlier" | null {
  if (!d) return null;
  if (d < new Date(start.getTime() - BASELINE_DAYS * DAY)) return "earlier";
  if (d < start) return "baseline";
  if (d <= end) return "during";
  return "after";
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Rough share of a video's length the average viewer watches. Used only for the
// viewer-minutes estimate; replace with real retention data where fellows share it.
const WATCH_FRACTION = (p: PostLike) => {
  if (p.durationSec == null) return 0.5;
  if (p.durationSec <= 90) return 0.6;
  if (p.durationSec <= 600) return 0.35;
  return 0.25;
};

export type WindowStats = {
  days: number;
  posts: number;
  postsPerWeek: number;
  aiSafetyPosts: number;
  aiSafetyShare: number | null;
  totalViews: number;
  aiSafetyViews: number;
  medianViews: number | null;
  medianAiSafetyViews: number | null;
  engagementRate: number | null; // (likes+comments+shares)/views
  postsWithCta: number;
  actionCtaPosts: number; // CTAs that ask for real-world action, not just follows
  viewerMinutes: number; // estimated AI-safety-weighted viewer minutes
};

const ACTION_CTAS = new Set(["contact-lawmaker", "petition-sign", "protest-event", "learn-course", "career", "use-tool", "donate"]);

export function statsFor(posts: PostLike[], days: number): WindowStats {
  const withViews = posts.filter((p) => p.views != null);
  const ais = posts.filter((p) => p.isAiSafety);
  const aisViews = ais.filter((p) => p.views != null);
  const viewsSum = sum(withViews.map((p) => p.views!));
  const eng = sum(withViews.map((p) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0)));
  return {
    days,
    posts: posts.length,
    postsPerWeek: days > 0 ? (posts.length / days) * 7 : 0,
    aiSafetyPosts: ais.length,
    aiSafetyShare: posts.length ? ais.length / posts.length : null,
    totalViews: viewsSum,
    aiSafetyViews: sum(aisViews.map((p) => p.views!)),
    medianViews: median(withViews.map((p) => p.views!)),
    medianAiSafetyViews: median(aisViews.map((p) => p.views!)),
    engagementRate: viewsSum > 0 ? eng / viewsSum : null,
    postsWithCta: posts.filter((p) => p.ctas.length).length,
    actionCtaPosts: posts.filter((p) => p.ctas.some((c) => ACTION_CTAS.has(c))).length,
    viewerMinutes: Math.round(
      sum(withViews.map((p) => (p.views! * WATCH_FRACTION(p) * ((p.durationSec ?? 45) / 60)) * Math.max(p.aiSafetyScore ?? 0, p.isAiSafety ? 0.5 : 0))),
    ),
  };
}

export function compareWindows(posts: PostLike[], start: Date, end: Date, now = new Date()) {
  const w = windowsFor(start, end, now);
  const by = (from: Date, to: Date) => posts.filter((p) => p.publishedAt && p.publishedAt >= from && p.publishedAt < to);
  const days = (from: Date, to: Date) => Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY));
  return {
    windows: w,
    baseline: statsFor(by(w.baseline.from, w.baseline.to), days(w.baseline.from, w.baseline.to)),
    during: statsFor(by(w.during.from, w.during.to), days(w.during.from, w.during.to)),
    after: w.after ? statsFor(by(w.after.from, w.after.to), days(w.after.from, w.after.to)) : null,
    afterMaturing: w.after ? now.getTime() - w.after.from.getTime() < 45 * DAY : false,
  };
}

// Ratio change, guarded for zero baselines.
export function lift(after: number | null | undefined, before: number | null | undefined) {
  if (after == null || before == null) return null;
  if (before === 0) return after > 0 ? Infinity : null;
  return after / before - 1;
}

// Weekly buckets for trajectory charts.
export function weekly(posts: PostLike[], from: Date, to: Date) {
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // Sunday
  const out: { week: string; t: number; posts: number; aiSafetyPosts: number; views: number; aiSafetyViews: number }[] = [];
  for (let t = start.getTime(); t <= to.getTime(); t += 7 * DAY) {
    const ps = posts.filter((p) => p.publishedAt && p.publishedAt.getTime() >= t && p.publishedAt.getTime() < t + 7 * DAY);
    out.push({
      week: new Date(t).toISOString().slice(0, 10),
      t,
      posts: ps.length,
      aiSafetyPosts: ps.filter((p) => p.isAiSafety).length,
      views: sum(ps.map((p) => p.views ?? 0)),
      aiSafetyViews: sum(ps.filter((p) => p.isAiSafety).map((p) => p.views ?? 0)),
    });
  }
  return out;
}

export function countBy<T extends string>(items: T[][]) {
  const m = new Map<T, number>();
  for (const arr of items) for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Flags accounts whose scraped history doesn't reach back to the baseline
// window, so before/after comparisons aren't over-read.
export type CoverageGap = { accountId: string; earliest: Date; posts: number; likelyTruncated: boolean };

export function coverageGaps(
  posts: { accountId: string; publishedAt: Date | null }[],
  start: Date,
  truncationThreshold = 38, // scrapes pull ~40–60 latest posts; at that count history was likely cut off
): CoverageGap[] {
  const baselineStart = new Date(start.getTime() - BASELINE_DAYS * DAY);
  const by = new Map<string, Date[]>();
  for (const p of posts) {
    if (!p.publishedAt) continue;
    if (!by.has(p.accountId)) by.set(p.accountId, []);
    by.get(p.accountId)!.push(p.publishedAt);
  }
  const out: CoverageGap[] = [];
  for (const [accountId, dates] of by) {
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    if (earliest > baselineStart) out.push({ accountId, earliest, posts: dates.length, likelyTruncated: dates.length >= truncationThreshold });
  }
  return out;
}
