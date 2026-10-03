import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { cadence, fmtTarget } from "@/lib/program";
import { planOf } from "@/lib/program-data";
import { FIELD_DEFS as FIELDS, type FieldKey } from "@/lib/fellow-fields";
import type { FellowFull } from "@/lib/data";
import { FellowField } from "@/components/fellow-field";
import { HealthBadge } from "@/components/health-badge";
import { CadenceChart } from "@/components/charts";
import { Editable } from "@/components/editable";
import { SectionTitle } from "@/components/bits";
import { ChangePassword } from "@/components/change-password";
import { cn } from "@/lib/utils";
import { AccountsEditor } from "@/components/accounts-editor";
import { setCadenceWeekValueAction } from "../../program-actions";

// Profile, goals and the content cadence plan vs. what was actually published.
// Team edits everything; the fellow edits the shared fields on their own page.

export async function PlanTab({ f, isTeam, isSelf, children }: { f: FellowFull; isTeam: boolean; isSelf: boolean; children?: React.ReactNode }) {
  const canEdit = isTeam || isSelf;
  const [weeks, shared, edits] = await Promise.all([
    db.cadenceWeek.findMany({ where: { fellowId: f.id }, select: { week: true, long: true, short: true, note: true } }),
    db.fellowNote.findMany({ where: { fellowId: f.id, shared: true }, orderBy: { date: { sort: "desc", nulls: "last" } } }),
    canEdit ? db.fellowEdit.findMany({ where: { fellowId: f.id }, orderBy: { createdAt: "desc" }, take: 12 }) : [],
  ]);
  const c = cadence(planOf({ ...f, cadenceWeeks: weeks }), f.posts, f.cohort.startDate, f.cohort.endDate);
  const field = (k: FieldKey, cls?: string) => (
    <div className={cls}>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{FIELDS[k].label}</p>
      <FellowField fellowId={f.id} field={k} value={f[k] as string | number | string[] | null} disabled={!canEdit || (!isTeam && !FIELDS[k].fellow)} />
      {canEdit && FIELDS[k].help && <p className="px-1 text-[11px] text-muted-foreground/80">{FIELDS[k].help}</p>}
    </div>
  );
  const status = isTeam ? (f.health ?? c.health) : c.health;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <section>
          <SectionTitle
            hint={c.currentWeek >= 1 && c.currentWeek <= c.totalWeeks ? `Week ${c.currentWeek} of ${c.totalWeeks}` : c.currentWeek < 1 ? "Fellowship hasn't started" : "Fellowship finished"}
            right={<HealthBadge health={status} pace={c.pace} />}
          >
            Content cadence
          </SectionTitle>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Long-form to date" actual={c.toDate.long.actual} expected={c.toDate.long.expected} total={c.toDate.long.programTarget} />
            <Stat label="Short-form to date" actual={c.toDate.short.actual} expected={c.toDate.short.expected} total={c.toDate.short.programTarget} />
            <Stat label="This week: long" actual={c.thisWeek?.long.actual ?? 0} expected={c.thisWeek?.long.target ?? null} />
            <Stat label="This week: short" actual={c.thisWeek?.short.actual ?? 0} expected={c.thisWeek?.short.target ?? null} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <CadenceChart
              data={c.weeks.map((w) => ({
                week: w.week,
                long: w.long.actual,
                short: w.short.actual,
                target: w.long.target == null && w.short.target == null ? null : (w.long.target ?? 0) + (w.short.target ?? 0),
                current: w.status === "current",
              }))}
            />
          </div>
          <details className="mt-3 rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Week by week{isTeam && " · override targets"}</summary>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 text-right font-medium">Long: done / plan</th>
                  <th className="px-3 py-2 text-right font-medium">Short: done / plan</th>
                  <th className="px-3 py-2 text-right font-medium">Written</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {c.weeks.map((w) => (
                  <tr key={w.week} className={cn("border-t", w.status === "current" && "bg-muted/40", w.status === "future" && "text-muted-foreground")}>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      W{w.week} <span className="text-xs text-muted-foreground">{shortDate(w.from).replace(/, \d{4}$/, "")}</span>
                    </td>
                    {(["long", "short"] as const).map((k) => (
                      <td key={k} className="px-3 py-1.5 text-right tabular-nums">
                        <span className={cn(w.status !== "future" && w[k].target != null && w[k].actual >= w[k].target! && "text-good")}>{w.status === "future" ? "" : w[k].actual}</span>
                        <span className="text-muted-foreground"> / </span>
                        {isTeam ? (
                          <span className="inline-block w-12 align-middle">
                            <Editable value={weeks.find((x) => x.week === w.week)?.[k] ?? null} type="number" placeholder={fmtTarget(w[k].target)} save={setCadenceWeekValueAction.bind(null, f.id, w.week, k)} />
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{fmtTarget(w[k].target)}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{w.status === "future" ? "" : w.written || "–"}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {isTeam ? <Editable value={w.note} type="text" placeholder="" save={setCadenceWeekValueAction.bind(null, f.id, w.week, "note")} /> : w.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
          <p className="mt-2 text-xs text-muted-foreground">
            Long = YouTube ≥3 min and podcasts; short = Shorts, TikToks, Reels, carousels.{f.cadenceScope === "ai-safety" && " Only AI-safety posts count for this fellow."} Posts appear after the weekly scrape.
            {isTeam && " Click a plan number to override that week (e.g. retreat week)."}
          </p>
        </section>

        {children}
      </div>

      <aside className="space-y-6">
        <section className="space-y-3 rounded-lg border bg-card p-3">
          <SectionTitle>Profile</SectionTitle>
          {field("about")}
          {field("interests")}
          {field("programGoals")}
          {field("fellowNotes")}
        </section>
        <section className="rounded-lg border bg-card p-3">
          <SectionTitle>Cadence plan</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {field("longPerWeek")}
            {field("shortPerWeek")}
            {field("programLong")}
            {field("programShort")}
          </div>
          {field("cadenceNote", "mt-3")}
          {isTeam && field("cadenceScope", "mt-3")}
        </section>

        {canEdit && <AccountsEditor fellowId={f.id} accounts={f.accounts} postAccountIds={f.posts.map((p) => p.accountId)} isTeam={isTeam} isSelf={isSelf} />}

        {isSelf && (
          <section className="rounded-lg border bg-card p-3">
            <SectionTitle hint={`You sign in as “${f.username}”.`}>Password</SectionTitle>
            <ChangePassword />
          </section>
        )}

        {isTeam && (
          <section className="space-y-3 rounded-lg border border-dashed p-3">
            <SectionTitle hint="Team only">Support</SectionTitle>
            {field("health")}
            {field("nextStep")}
            {field("needs")}
            <div className="grid grid-cols-2 gap-3">
              {field("pointOfContact")}
              {field("buddy")}
            </div>
            {field("slackUserId")}
          </section>
        )}

        {(shared.length > 0 || isTeam) && (
          <section>
            <SectionTitle hint={isTeam ? "Notes marked 'share with fellow' on the Context tab" : "Decisions and next steps from the Frame team"}>From Frame</SectionTitle>
            <ul className="space-y-2 text-sm">
              {shared.map((n) => (
                <li key={n.id} className="rounded-md bg-muted/50 px-3 py-2">
                  <p className={cn("font-medium", n.done && "text-muted-foreground line-through")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {shortDate(n.date)} · {n.kind}
                  </p>
                </li>
              ))}
              {!shared.length && <li className="text-xs text-muted-foreground">Nothing shared yet.</li>}
            </ul>
          </section>
        )}

        {edits.length > 0 && (
          <section>
            <SectionTitle>Recent edits</SectionTitle>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {edits.map((e) => (
                <li key={e.id}>
                  <span className="text-foreground">{e.by === "fellow" ? f.name.split(" ")[0] : "Team"}</span> set {FIELDS[e.field as FieldKey]?.label.toLowerCase() ?? e.field}
                  {e.after ? ` to “${e.after.slice(0, 60)}${e.after.length > 60 ? "…" : ""}”` : " to blank"} · {shortDate(e.createdAt)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, actual, expected, total }: { label: string; actual: number; expected: number | null; total?: number | null }) {
  const ok = expected != null && actual >= expected * 0.8;
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        <span className={cn(expected != null && (ok ? "text-good" : "text-bad"))}>{actual}</span>
        <span className="text-sm font-normal text-muted-foreground"> / {expected == null ? "–" : fmtTarget(Math.round(expected * 10) / 10)} expected</span>
      </p>
      {total != null && <p className="text-[11px] text-muted-foreground">Program goal {total}</p>}
    </div>
  );
}
