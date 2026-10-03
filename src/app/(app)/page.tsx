import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { compact, daysAgo, relativeDate } from "@/lib/format";
import { programRows, type ProgramRow } from "@/lib/program-data";
import { fmtTarget } from "@/lib/program";
import { ColumnToggle } from "@/components/column-toggle";
import { CreatorAvatar } from "@/components/creator-avatar";
import { HealthBadge } from "@/components/health-badge";
import { SectionTitle, StatTile } from "@/components/bits";
import { cn } from "@/lib/utils";
import { COLUMNS, FellowsTable } from "./fellows-table";

export const metadata: Metadata = { title: "Home" };

// Team home: who needs attention this week, the cohort at a glance, and the
// editable fellows table. Funders land on the impact report instead.

type Flag = { label: string; tone: "bad" | "warn" };

function flagsFor(r: ProgramRow, concerns: number, oldestOpenAction: Date | null, now: number): Flag[] {
  const out: Flag[] = [];
  const health = r.f.health ?? r.cadence.health;
  const DAY = 86_400_000;
  if (health === "needs-help") out.push({ label: "Marked needs help", tone: "bad" });
  if (health === "off-track") out.push({ label: `Off track (${Math.round((r.cadence.pace ?? 0) * 100)}% of plan)`, tone: "bad" });
  if (health === "no-plan") out.push({ label: "No cadence plan", tone: "warn" });
  if (!r.f.accounts.length) out.push({ label: "No accounts tracked", tone: "warn" });
  else if (!r.lastPost || now - r.lastPost.getTime() > 14 * DAY) out.push({ label: `Quiet: last post ${relativeDate(r.lastPost)}`, tone: "warn" });
  if (concerns) out.push({ label: `Raised a concern in Slack`, tone: "bad" });
  if (!r.lastMeeting || now - r.lastMeeting.getTime() > 21 * DAY) out.push({ label: `No 1:1 in ${r.lastMeeting ? relativeDate(r.lastMeeting).replace(" ago", "") : "the program"}`, tone: "warn" });
  if (oldestOpenAction && now - oldestOpenAction.getTime() > 7 * DAY) out.push({ label: `${r.openActions} open action${r.openActions > 1 ? "s" : ""}, oldest ${relativeDate(oldestOpenAction)}`, tone: "warn" });
  return out;
}

export default async function HomePage(props: PageProps<"/">) {
  const role = await getRole();
  if (role !== "team") redirect(role === "fellow" ? "/me" : "/impact");
  const sp = await props.searchParams;
  const cohorts = await db.cohort.findMany({ orderBy: { startDate: "desc" } });
  const cohort = cohorts.find((c) => c.slug === sp.cohort) ?? cohorts[0]!;
  const weekAgo = daysAgo(7);
  const [rows, concerns, openActions, signals] = await Promise.all([
    programRows(cohort.slug),
    db.slackMessage.groupBy({ by: ["fellowId"], where: { postedAt: { gte: weekAgo }, signals: { has: "concern" }, fellow: { cohortId: cohort.id } }, _count: true }),
    db.fellowNote.groupBy({ by: ["fellowId"], where: { kind: "action", done: false, fellow: { cohortId: cohort.id } }, _min: { createdAt: true } }),
    db.comment.findMany({
      where: { isCreator: false, fellow: { cohortId: cohort.id }, post: { publishedAt: { gte: cohort.startDate } } },
      select: { signals: true },
    }),
  ]);
  const now = daysAgo(0).getTime();
  const concernBy = new Map(concerns.map((c) => [c.fellowId, c._count]));
  const actionBy = new Map(openActions.map((a) => [a.fellowId, a._min.createdAt]));
  const flagged = rows
    .map((r) => ({ r, flags: flagsFor(r, concernBy.get(r.f.id) ?? 0, actionBy.get(r.f.id) ?? null, now) }))
    .filter((x) => x.flags.length && x.r.f.health !== "paused");
  // Urgent = at least one red flag; the rest get a one-line mention.
  const attention = flagged
    .filter((x) => x.flags.some((f) => f.tone === "bad"))
    .sort((a, b) => b.flags.filter((f) => f.tone === "bad").length - a.flags.filter((f) => f.tone === "bad").length || (a.r.cadence.pace ?? 1) - (b.r.cadence.pace ?? 1));
  const watch = flagged.filter((x) => !x.flags.some((f) => f.tone === "bad"));

  // Cohort at a glance (posts counted the same way as cadence: company channels only count AI-safety posts).
  const inProgram = rows.flatMap((r) => r.f.posts.filter((p) => p.publishedAt && p.publishedAt >= cohort.startDate && (r.f.cadenceScope !== "ai-safety" || p.isAiSafety)));
  const aiViews = inProgram.filter((p) => p.isAiSafety).reduce((s, p) => s + (p.views ?? 0), 0);
  const weekActual = rows.reduce((s, r) => s + (r.cadence.thisWeek ? r.cadence.thisWeek.long.actual + r.cadence.thisWeek.short.actual : 0), 0);
  const weekPlan = rows.reduce((s, r) => s + (r.cadence.thisWeek ? (r.cadence.thisWeek.long.target ?? 0) + (r.cadence.thisWeek.short.target ?? 0) : 0), 0);
  const withPlan = rows.filter((r) => !["no-plan", "not-started"].includes(r.cadence.health));
  const onTrack = withPlan.filter((r) => ["on-track", "done"].includes(r.f.health ?? r.cadence.health)).length;
  const moved = signals.filter((c) => c.signals.some((s) => s === "changed-mind" || s === "learned" || s === "action")).length;
  const c0 = rows[0]?.cadence;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{cohort.name.split(" (")[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {c0 && c0.currentWeek >= 1 && c0.currentWeek <= c0.totalWeeks ? `Week ${c0.currentWeek} of ${c0.totalWeeks}` : c0 && c0.currentWeek > c0.totalWeeks ? "Fellowship finished" : "Not started"} ·{" "}
            {rows.length} fellows
          </p>
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          {cohorts.map((c) => (
            <Link key={c.id} href={c.id === cohorts[0]!.id ? "/" : `/?cohort=${c.slug}`} className={cn("rounded px-2 py-1", c.id === cohort.id ? "bg-muted font-medium" : "text-muted-foreground")}>
              {c.name.split(" (")[0]}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="On track" value={`${onTrack} / ${withPlan.length}`} sub="fellows with a cadence plan" />
        <StatTile label="This week" value={`${weekActual} / ${fmtTarget(Math.round(weekPlan * 10) / 10)}`} sub="posts vs planned" />
        <StatTile label="Posts this fellowship" value={inProgram.length} sub={`${inProgram.filter((p) => p.isAiSafety).length} on AI safety`} />
        <StatTile label="AI-safety views" value={compact(aiViews)} sub="on posts since the start" />
        <StatTile label="Audience moved" value={compact(moved)} sub="comments: changed mind, learned, or acting" />
      </section>

      <section>
        <SectionTitle hint="Off track on their cadence plan, marked needs help, or raised a concern in Slack this week. Other flags: quiet 2+ weeks, no 1:1 in 3+ weeks, actions open over a week.">
          Needs attention · {attention.length}
        </SectionTitle>
        {attention.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {attention.map(({ r, flags }) => (
              <Link key={r.f.id} href={`/fellows/${r.f.slug}`} className="flex gap-3 rounded-lg border bg-card p-3 hover:border-foreground/30">
                <CreatorAvatar name={r.f.name} src={r.f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{r.f.name}</p>
                    <HealthBadge health={r.f.health ?? r.cadence.health} />
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {flags.map((f) => (
                      <li key={f.label} className={f.tone === "bad" ? "text-bad" : "text-muted-foreground"}>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                  {r.f.nextStep && <p className="mt-1 line-clamp-1 text-xs">Next: {r.f.nextStep}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Nobody is off track or flagging a concern.</p>
        )}
        {watch.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Also worth a look: </span>
            {watch.map((x, i) => (
              <span key={x.r.f.id}>
                {i > 0 && " · "}
                <Link href={`/fellows/${x.r.f.slug}`} className="text-foreground hover:underline">
                  {x.r.f.name.split(" ")[0]}
                </Link>{" "}
                ({x.flags.map((f) => f.label.replace(/^Quiet: last post /, "quiet, last post ").toLowerCase()).join(", ")})
              </span>
            ))}
          </p>
        )}
      </section>

      <section>
        <SectionTitle hint="Click any cell to edit. Changes save instantly and are logged." right={<ColumnToggle id="fellows" columns={COLUMNS} />}>
          All fellows
        </SectionTitle>
        <FellowsTable rows={rows} />
      </section>
    </div>
  );
}
