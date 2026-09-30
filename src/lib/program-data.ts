import "server-only";
import { db } from "@/lib/db";
import { cadence, type Plan } from "@/lib/program";
import { inviteToken } from "@/lib/session";

const DAY = 86_400_000;

export const planOf = (f: { longPerWeek: number | null; shortPerWeek: number | null; programLong: number | null; programShort: number | null; cadenceScope: string; cadenceWeeks: Plan["weeks"] }): Plan => ({
  longPerWeek: f.longPerWeek,
  shortPerWeek: f.shortPerWeek,
  programLong: f.programLong,
  programShort: f.programShort,
  cadenceScope: f.cadenceScope,
  weeks: f.cadenceWeeks,
});

// Everything the Fellows database needs, one row per fellow.
export async function programRows(cohortSlug: string) {
  const now = new Date();
  const fellows = await db.fellow.findMany({
    where: { cohort: { slug: cohortSlug } },
    orderBy: { name: "asc" },
    omit: { passwordHash: true },
    include: {
      cohort: true,
      cadenceWeeks: { select: { week: true, long: true, short: true, note: true } },
      accounts: { select: { id: true, platform: true, handle: true, isPrimary: true, avatarUrl: true } },
      posts: { select: { platform: true, kind: true, durationSec: true, publishedAt: true, isAiSafety: true, views: true }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } } },
      context: { select: { kind: true, date: true, done: true, source: true } },
      resources: { select: { status: true } },
      _count: { select: { slack: { where: { postedAt: { gte: new Date(now.getTime() - 30 * DAY) } } } } },
    },
  });
  const withPassword = new Set((await db.fellow.findMany({ where: { cohort: { slug: cohortSlug }, passwordHash: { not: null } }, select: { id: true } })).map((x) => x.id));
  return fellows.map((f) => {
    const c = cadence(planOf(f), f.posts, f.cohort.startDate, f.cohort.endDate, now);
    const meetings = f.context.filter((n) => n.kind === "meeting" && n.date).sort((a, b) => b.date!.getTime() - a.date!.getTime());
    return {
      f,
      cadence: c,
      lastPost: f.posts.find((p) => p.publishedAt)?.publishedAt ?? null,
      lastMeeting: meetings[0]?.date ?? null,
      openActions: f.context.filter((n) => n.kind === "action" && !n.done).length,
      attended: f.resources.filter((r) => r.status === "attended" || r.status === "liked").length,
      interested: f.resources.filter((r) => r.status === "interested").length,
      slack30d: f._count.slack,
      invite: `/join/${inviteToken(f.id, f.accessVersion)}`,
      hasPassword: withPassword.has(f.id),
    };
  });
}

export type ProgramRow = Awaited<ReturnType<typeof programRows>>[number];
