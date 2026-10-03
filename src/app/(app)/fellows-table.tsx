import Link from "next/link";
import { relativeDate } from "@/lib/format";
import type { ProgramRow } from "@/lib/program-data";
import { fmtTarget, HEALTH_LABEL, type Health } from "@/lib/program";
import { FellowField } from "@/components/fellow-field";
import { CreatorAvatar } from "@/components/creator-avatar";
import { CopyLink } from "@/components/copy-link";
import { HEALTH_STYLE } from "@/components/health-badge";
import { cn } from "@/lib/utils";
import { Editable } from "@/components/editable";
import { PasswordReveal } from "@/components/password-reveal";
import { generatePasswordAction, rotateAccessAction, setUsernameAction } from "./program-actions";

export const COLUMNS = [
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
  { key: "access", label: "Fellow sign-in" },
];


// The fellows database table (team only). Cells are editable inline; columns
// are shown/hidden by <ColumnToggle id="fellows">.
export function FellowsTable({ rows }: { rows: ProgramRow[] }) {
  return (
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
      </td>
      <td data-col="interests" className="min-w-64 px-3 py-2">
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
      <td data-col="access" className="min-w-44 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>User</span>
          <Editable value={f.username} type="text" placeholder="set username" save={setUsernameAction.bind(null, f.id)} className="font-mono text-xs" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {r.hasPassword ? <span className="text-good">Password set</span> : <span>No password</span>}
          <PasswordReveal hasPassword={r.hasPassword} generate={generatePasswordAction.bind(null, f.id)} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <CopyLink path={r.invite} label="Copy sign-in link" />
          <form action={rotateAccessAction.bind(null, f.id)} className="inline">
            <button className="hover:text-bad" title="Sign the fellow out everywhere and invalidate their link">
              Sign out all
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

