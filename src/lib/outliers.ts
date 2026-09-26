import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Outlier = a post's views divided by the median views of the same account's
// previous posts (up to 20, needs at least 5). This is the "×N your usual"
// number creator tools use: it controls for audience size, so a 3× on a
// small channel counts the same as a 3× on a big one.
//
// Posts younger than MATURE_DAYS are still accumulating views; they're
// flagged, not excluded, since an early spike is itself a signal.

const PRIOR = 20;
const MIN_PRIOR = 5;
export const MATURE_DAYS = 7;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export async function scoredPosts(where: Prisma.PostWhereInput = {}) {
  const posts = await db.post.findMany({
    where: { publishedAt: { not: null }, views: { not: null } },
    orderBy: { publishedAt: "asc" },
    select: { id: true, accountId: true, publishedAt: true, views: true },
  });
  const byAcc = new Map<string, typeof posts>();
  for (const p of posts) {
    if (!byAcc.has(p.accountId)) byAcc.set(p.accountId, []);
    byAcc.get(p.accountId)!.push(p);
  }
  const score = new Map<string, { baseline: number; multiplier: number; prior: number }>();
  for (const list of byAcc.values()) {
    list.forEach((p, i) => {
      const prior = list.slice(Math.max(0, i - PRIOR), i).map((x) => x.views!);
      if (prior.length < MIN_PRIOR) return;
      const baseline = Math.max(1, median(prior));
      score.set(p.id, { baseline, multiplier: p.views! / baseline, prior: prior.length });
    });
  }
  const ids = [...score.keys()];
  const rows = await db.post.findMany({
    where: { ...where, id: { in: ids } },
    select: {
      id: true,
      url: true,
      title: true,
      caption: true,
      platform: true,
      publishedAt: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
      durationSec: true,
      isAiSafety: true,
      topics: true,
      ctas: true,
      kind: true,
      thumbnailUrl: true,
      fellow: { select: { name: true, slug: true, cohort: { select: { slug: true, name: true, startDate: true, endDate: true } } } },
      account: { select: { handle: true } },
    },
  });
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    ...score.get(r.id)!,
    maturing: now - r.publishedAt!.getTime() < MATURE_DAYS * 86_400_000,
  }));
}
