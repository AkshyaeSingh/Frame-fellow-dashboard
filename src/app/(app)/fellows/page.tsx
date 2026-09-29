import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeDate } from "@/lib/format";
import { programRows, type ProgramRow } from "@/lib/program-data";
import { fmtTarget, HEALTH_LABEL, type Health } from "@/lib/program";
import { FellowField } from "@/components/fellow-field";
import { ColumnToggle } from "@/components/column-toggle";
import { CreatorAvatar } from "@/components/creator-avatar";
import { CopyLink } from "@/components/copy-link";
import { HEALTH_STYLE } from "@/components/health-badge";
import { cn } from "@/lib/utils";
import { rotateAccessAction } from "../program-actions";

export const metadata: Metadata = { title: "Fellows" };

const COLUMNS = [
  { key: "status", label: "Status", simple: true },
  { key: "week", label: "This week", simple: true },
  { key: "pace", label: "Program to date", simple: true },
  { key: "lastPost", label: "Last post", simple: true },
  { key: "lastMeeting", label: "Last 1:1", simple: true },
  { key: "actions", label: "Open actions", simple: true },
  { key: "nextStep", label: "Next step", simple: true },
  { key: "track", label: "Track / org" },
  { key: "cadence", label: "Cadence plan" },
  { key: "interests", label: "Interests" },
  { key: "programGoals", label: "Fellowship goals" },
  { key: "needs", label: "What they need" },
  { key: "poc", label: "Point of contact" },
  { key: "buddy", label: "Buddy" },
  { key: "events", label: "Events" },
  { key: "slack", label: "Slack" },
  { key: "access", label: "Fellow sign-in link" },
];


export default async function FellowsPage(props: PageProps<"/fellows">) {
  if ((await getRole()) !== "team") redirect("/");
  const sp = await props.searchParams;
  const cohorts = await db.cohort.findMany({ orderBy: { startDate: "desc" } });
  const cohort = cohorts.find((c) => c.slug === sp.cohort) ?? cohorts[0]!;
  const rows = await programRows(cohort.slug);
  const counts = rows.reduce<Record<string, number>>((m, r) => {
    const h = r.f.health ?? r.cadence.health;
    m[h] = (m[h] ?? 0) + 1;
    return m;
  }, {});
  const week = rows[0]?.cadence;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fellows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cohort.name}
            {week && week.currentWeek >= 1 && week.currentWeek <= week.totalWeeks && ` · week ${week.currentWeek} of ${week.totalWeeks}`}. Click any cell to edit. Changes save instantly and are logged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5 text-xs">
            {cohorts.map((c) => (
              <Link key={c.id} href={`/fellows?cohort=${c.slug}`} className={cn("rounded px-2 py-1", c.id === cohort.id ? "bg-muted font-medium" : "text-muted-foreground")}>
                {c.name.split(" (")[0]}
              </Link>
            ))}
          </div>
          <ColumnToggle id="fellows" columns={COLUMNS} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(counts).map(([h, n]) => (
          <span key={h} className={cn("rounded px-2 py-1", HEALTH_STYLE[h])}>
            {HEALTH_LABEL[h as Health]} · {n}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card" data-table="fellows">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">Fellow</th>
              {COLUMNS.map((c) => (
                <th key={c.key} data-col={c.key} className="px-3 py-2 font-medium whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.f.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Status is computed from the cadence plan: actual posts vs expected to date, with long-form weighted 4× (≥80% on track, 50–80% behind). Set it by hand to override.
        Formats: long = YouTube ≥3 min and podcasts; short = Shorts, TikToks, Reels, carousels. Written posts (X, LinkedIn, Substack) are shown but not counted.
      </p>
    </div>
  );
}

function Row({ r }: { r: ProgramRow }) {
  const { f, cadence: c } = r;
  const auto = c.health;
  const tw = c.thisWeek;
  const pair = (actual: number, target: number | null) => (
    <span className={cn("tabular-nums", target != null && actual >= target ? "text-good" : target != null && target > 0 ? "text-foreground" : "text-muted-foreground")}>
      {actual}
      <span className="text-muted-foreground">/{fmtTarget(target)}</span>
    </span>
  );
  return (
    <tr className="border-t align-top hover:bg-muted/20">
      <td className="sticky left-0 z-10 bg-card px-3 py-2">
        <Link href={`/fellows/${f.slug}`} className="flex items-center gap-2 font-medium whitespace-nowrap hover:underline">
          <CreatorAvatar name={f.name} src={f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-6 text-[10px]" />
          {f.name}
        </Link>
      </td>
      <td data-col="status" className="px-3 py-2">
        <FellowField
          fellowId={f.id}
          field="health"
          value={f.health}
          display={
            <span className={cn("rounded px-1.5 py-0.5 text-xs whitespace-nowrap", HEALTH_STYLE[f.health ?? auto])}>
              {HEALTH_LABEL[(f.health ?? auto) as Health]}
              {!f.health && c.pace != null && <span className="opacity-70"> · {Math.round(c.pace * 100)}%</span>}
            </span>
          }
        />
      </td>
      <td data-col="week" className="px-3 py-2 text-xs whitespace-nowrap">
        {tw ? (
          <>
            <span className="text-muted-foreground">L </span>
            {pair(tw.long.actual, tw.long.target)} <span className="ml-1 text-muted-foreground">S </span>
            {pair(tw.short.actual, tw.short.target)}
          </>
        ) : (
          "–"
        )}
      </td>
      <td data-col="pace" className="px-3 py-2 text-xs whitespace-nowrap">
        <span className="text-muted-foreground">L </span>
        {pair(c.toDate.long.actual, c.toDate.long.programTarget)} <span className="ml-1 text-muted-foreground">S </span>
        {pair(c.toDate.short.actual, c.toDate.short.programTarget)}
      </td>
      <td data-col="lastPost" className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
        {f.accounts.length ? relativeDate(r.lastPost) : "no handles"}
      </td>
      <td data-col="lastMeeting" className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
        {relativeDate(r.lastMeeting)}
      </td>
      <td data-col="actions" className="px-3 py-2 text-xs tabular-nums">
        {r.openActions ? (
          <Link href={`/fellows/${f.slug}?tab=context`} className="hover:underline">
            {r.openActions}
          </Link>
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </td>
      <td data-col="nextStep" className="min-w-56 px-3 py-2">
        <FellowField fellowId={f.id} field="nextStep" value={f.nextStep} />
      </td>
      <td data-col="track" className="px-3 py-2 text-xs">
        <FellowField fellowId={f.id} field="track" value={f.track} />
        <FellowField fellowId={f.id} field="partnerOrg" value={f.partnerOrg} className="text-muted-foreground" />
      </td>
      <td data-col="cadence" className="px-3 py-2 text-xs">
        <div className="grid grid-cols-[auto_auto] items-center gap-x-2">
          <span className="text-muted-foreground">Long/wk</span>
          <FellowField fellowId={f.id} field="longPerWeek" value={f.longPerWeek} />
          <span className="text-muted-foreground">Short/wk</span>
          <FellowField fellowId={f.id} field="shortPerWeek" value={f.shortPerWeek} />
          <span className="text-muted-foreground">Total L</span>
          <FellowField fellowId={f.id} field="programLong" value={f.programLong} />
          <span className="text-muted-foreground">Total S</span>
          <FellowField fellowId={f.id} field="programShort" value={f.programShort} />
        </div>
        <FellowField fellowId={f.id} field="cadenceNote" value={f.cadenceNote} className="mt-1 max-w-64 text-xs text-muted-foreground" />
      </td>
      <td data-col="interests" className="min-w-48 px-3 py-2">
        <FellowField fellowId={f.id} field="interests" value={f.interests} />
      </td>
      <td data-col="programGoals" className="min-w-56 px-3 py-2">
        <FellowField fellowId={f.id} field="programGoals" value={f.programGoals} />
      </td>
      <td data-col="needs" className="min-w-48 px-3 py-2">
        <FellowField fellowId={f.id} field="needs" value={f.needs} />
      </td>
      <td data-col="poc" className="px-3 py-2">
        <FellowField fellowId={f.id} field="pointOfContact" value={f.pointOfContact} />
      </td>
      <td data-col="buddy" className="px-3 py-2">
        <FellowField fellowId={f.id} field="buddy" value={f.buddy} />
      </td>
      <td data-col="events" className="px-3 py-2 text-xs whitespace-nowrap">
        <Link href={`/fellows/${f.slug}?tab=opportunities`} className="hover:underline">
          {r.attended} attended · {r.interested} interested
        </Link>
      </td>
      <td data-col="slack" className="px-3 py-2 text-xs">
        <FellowField fellowId={f.id} field="slackUserId" value={f.slackUserId} />
        {f.slackUserId && <span className="text-muted-foreground">{r.slack30d} msgs / 30d</span>}
      </td>
      <td data-col="access" className="px-3 py-2 text-xs whitespace-nowrap">
        <CopyLink path={r.invite} />
        <form action={rotateAccessAction.bind(null, f.id)} className="inline">
          <button className="ml-2 text-muted-foreground hover:text-bad" title="Invalidate the current link and any sessions from it">
            Reset
          </button>
        </form>
      </td>
    </tr>
  );
}

