import "server-only";
import { db } from "@/lib/db";
import { compareWindows, coverageGaps, type PostLike } from "@/lib/metrics";

export const postLikeSelect = {
  accountId: true,
  platform: true,
  publishedAt: true,
  views: true,
  likes: true,
  comments: true,
  shares: true,
  durationSec: true,
  isAiSafety: true,
  aiSafetyScore: true,
  ctas: true,
  topics: true,
  orgsMentioned: true,
  kind: true,
} as const;

// Latest follower count per account, plus the earliest in-or-before-baseline one.
export async function followerSummary(accountIds: string[]) {
  const snaps = await db.accountSnapshot.findMany({
    where: { accountId: { in: accountIds }, followers: { not: null } },
    orderBy: { takenAt: "asc" },
    select: { accountId: true, takenAt: true, followers: true, source: true },
  });
  const byAcc = new Map<string, typeof snaps>();
  for (const s of snaps) {
    if (!byAcc.has(s.accountId)) byAcc.set(s.accountId, []);
    byAcc.get(s.accountId)!.push(s);
  }
  return byAcc;
}

export async function getPortfolio() {
  const fellows = await db.fellow.findMany({
    include: {
      cohort: true,
      accounts: { select: { id: true, platform: true, handle: true, isPrimary: true, avatarUrl: true } },
      posts: { select: postLikeSelect },
      _count: { select: { outcomes: true, trudy: true } },
    },
    orderBy: [{ cohort: { startDate: "asc" } }, { name: "asc" }],
  });
  const snaps = await followerSummary(fellows.flatMap((f) => f.accounts.map((a) => a.id)));
  return fellows.map((f) => {
    const cmp = compareWindows(f.posts as PostLike[], f.cohort.startDate, f.cohort.endDate);
    const followers = f.accounts.reduce((s, a) => s + (snaps.get(a.id)?.at(-1)?.followers ?? 0), 0);
    const gaps = coverageGaps(f.posts, f.cohort.startDate).filter((g) => g.likelyTruncated);
    return { fellow: f, cmp, followers, totalPosts: f.posts.length, truncated: gaps.length > 0 };
  });
}

export async function getFellow(slug: string) {
  return db.fellow.findUnique({
    where: { slug },
    include: {
      cohort: true,
      accounts: { include: { snapshots: { orderBy: { takenAt: "asc" } } }, orderBy: [{ isPrimary: "desc" }, { platform: "asc" }] },
      posts: {
        orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
        select: {
          ...postLikeSelect,
          id: true,
          accountId: true,
          url: true,
          title: true,
          caption: true,
          thumbnailUrl: true,
          transcript: false,
          hashtags: true,
          isSponsored: true,
          framing: true,
          analysis: true,
          analyzedBy: true,
          collaborators: true,
        },
      },
      outcomes: { orderBy: { date: { sort: "desc", nulls: "last" } } },
      trudy: { orderBy: { reportDate: { sort: "desc", nulls: "last" } } },
      responses: true,
    },
  });
}

export type FellowFull = NonNullable<Awaited<ReturnType<typeof getFellow>>>;
