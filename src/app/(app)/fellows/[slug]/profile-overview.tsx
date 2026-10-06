import Link from "next/link";
import { CalendarDays, Check, ExternalLink, MapPin, MessageSquare, Video, X } from "lucide-react";
import { db } from "@/lib/db";
import type { FellowFull } from "@/lib/data";
import { compact, eventDate, shortDate } from "@/lib/format";
import { cadence } from "@/lib/program";
import { planOf } from "@/lib/program-data";
import { checklistsFor } from "@/lib/checklist-data";
import { STATUSES, STATUS_SCORE, cadenceStatus, isAmplifier } from "@/lib/checklist";
import { SLACK_SIGNALS } from "@/lib/slack";
import { FIELD_DEFS, type FieldKey } from "@/lib/fellow-fields";
import { ProgressRing } from "@/components/progress-ring";
import { StatusPill } from "@/components/status-pill";
import { Editable } from "@/components/editable";
import { FellowField } from "@/components/fellow-field";
import { SectionTitle } from "@/components/bits";
import { cn } from "@/lib/utils";
import { addGoalAction, deleteGoalAction, setGoalStatusAction, setResourceStatusAction, updateGoalAction } from "../../program-actions";
import { nextSteps } from "./context-tab";
import { PlanTab } from "./plan-tab";
import { OverviewTab } from "./overview-tab";
import type { compareWindows } from "@/lib/metrics";

// The team's fellow profile: who they are and how they're doing at a glance
// (ring + checklist), what we last discussed, what's happened, and how we can help.

export async function ProfileOverview({ f, cmp }: { f: FellowFull; cmp: ReturnType<typeof compareWindows> }) {
  const now = new Date();
  const [checklists, weeks, meetings, events, slack] = await Promise.all([
    checklistsFor([f.id]),
    db.cadenceWeek.findMany({ where: { fellowId: f.id }, select: { week: true, long: true, short: true, note: true } }),
    db.fellowNote.findMany({ where: { fellowId: f.id, kind: { in: ["meeting", "decision", "action"] } }, orderBy: { date: { sort: "desc", nulls: "last" } } }),
    db.resource.findMany({
      where: { source: "gcal", date: { gte: f.cohort.startDate, lte: f.cohort.endDate } },
      orderBy: { date: "asc" },
      include: { fellows: { where: { fellowId: f.id } } },
    }),
    db.slackMessage.findMany({ where: { fellowId: f.id }, orderBy: { postedAt: "desc" }, take: 40 }),
  ]);
  const c = cadence(planOf({ ...f, cadenceWeeks: weeks }), f.posts, f.cohort.startDate, f.cohort.endDate, now);
  const goals = (checklists.get(f.id) ?? []).map((g) => (g.key === "cadence" ? { ...g, status: cadenceStatus(c.health) } : g));
  const pct = goals.length ? goals.reduce((s, g) => s + (STATUS_SCORE[g.status] ?? 0), 0) / goals.length : 0;
  const oneOnOnes = meetings.filter((m) => m.kind === "meeting");
  const latest = oneOnOnes[0];
  const past = events.filter((e) => e.date && e.date <= now);
  const mandatory = past.filter((e) => e.tags.includes("mandatory"));
  const status = (e: (typeof events)[number]) => e.fellows[0]?.status ?? null;
  const came = (e: (typeof events)[number]) => ["attended", "liked"].includes(status(e) ?? "");
  const amp = isAmplifier(f.track);
  const org = f.partnerOrg?.replace(/\s*\(.*\)\s*$/, "").trim();
  const field = (k: FieldKey) => (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{FIELD_DEFS[k].label}</p>
      <FellowField fellowId={f.id} field={k} value={f[k] as string | number | string[] | null} />
    </div>
  );

  // Timeline: meetings, decisions, events attended, posts and Slack moments, newest first.
  const timeline = [
    ...meetings.map((m) => ({ t: m.date ?? m.createdAt, icon: m.kind === "meeting" ? "meeting" : "note", text: m.title, sub: m.kind === "meeting" ? "1:1 / meeting" : m.kind === "decision" ? "Decision" : "Action item", href: `/fellows/${f.slug}?tab=notes` })),
    ...past.filter(came).map((e) => ({ t: e.date!, icon: "event", text: e.title, sub: "Attended", href: undefined })),
    ...f.posts
      .filter((p) => p.publishedAt && p.publishedAt >= f.cohort.startDate)
      .map((p) => ({ t: p.publishedAt!, icon: "post", text: p.title ?? p.caption?.slice(0, 80) ?? "Post", sub: `${compact(p.views)} views`, href: p.url ?? undefined })),
    ...slack
      .filter((m) => m.signals.some((x) => ["win", "concern"].includes(x)))
      .map((m) => ({ t: m.postedAt, icon: "slack", text: m.text.slice(0, 90), sub: m.signals.includes("concern") ? "Concern in Slack" : "Win in Slack", href: m.permalink ?? undefined })),
  ]
    .sort((a, b) => b.t.getTime() - a.t.getTime())
    .slice(0, 14);
  const ICON = { meeting: Video, note: MessageSquare, event: CalendarDays, post: ExternalLink, slack: MessageSquare } as const;

  return (
    <div className="space-y-8">
      {/* Fellow card + progress checklist */}
      <section className="grid gap-6 rounded-xl border bg-card p-5 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3 lg:w-56">
          <ProgressRing name={f.name} src={f.accounts.find((a) => a.avatarUrl)?.avatarUrl} statuses={goals.map((g) => g.status)} amplifier={amp} size={150} />
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(pct * 100)}%<span className="ml-1 text-xs font-normal text-muted-foreground">through their checklist</span>
          </p>
          <ul className="w-full space-y-1.5 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                {amp ? <span className="font-medium">{org}</span> : "Independent track"}
                {f.hometown && <span className="text-muted-foreground">, {f.hometown}</span>}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Video className="size-4 text-muted-foreground" />
              <Link href={`/fellows/${f.slug}?tab=notes`} className="hover:underline">
                {oneOnOnes.length} 1:1s{latest && <span className="text-muted-foreground"> · last {shortDate(latest.date)}</span>}
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>
                {mandatory.filter(came).length}/{mandatory.length} mandatory events
                <span className="text-muted-foreground"> · {past.filter(came).length} total</span>
              </span>
            </li>
          </ul>
          <div className="w-full space-y-2 border-t pt-3">
            {field("health")}
            {field("progressNote")}
          </div>
        </div>

        <div>
          <SectionTitle hint={`Week ${Math.max(0, Math.min(c.currentWeek, c.totalWeeks))} of ${c.totalWeeks}. Click a status to change it; content cadence follows their plan.`}>Fellowship progress</SectionTitle>
          <ul className="divide-y rounded-lg border">
            {goals.map((g) => (
              <li key={g.id} className="grid grid-cols-[8rem_1fr_auto] items-start gap-3 px-3 py-2">
                <StatusPill status={g.status} readOnly={g.key === "cadence"} onChange={setGoalStatusAction.bind(null, g.id)} title={g.key === "cadence" ? "Follows their cadence plan" : undefined} />
                <div className="min-w-0">
                  <Editable value={g.title} type="text" save={updateGoalAction.bind(null, g.id, "title")} className="font-medium" />
                  {g.key === "cadence" ? (
                    <p className="px-1 text-xs text-muted-foreground">
                      {c.toDate.long.actual} long · {c.toDate.short.actual} short so far{c.pace != null && ` · ${Math.round(c.pace * 100)}% of plan`}
                    </p>
                  ) : (
                    <Editable value={g.note} type="long" placeholder="Add a note…" save={updateGoalAction.bind(null, g.id, "note")} className="text-xs text-muted-foreground" />
                  )}
                </div>
                {!g.key && (
                  <form action={deleteGoalAction.bind(null, g.id)}>
                    <button className="pt-1 text-xs text-muted-foreground hover:text-bad">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <form action={addGoalAction.bind(null, f.id)} className="mt-2 flex gap-2">
            <input name="title" required placeholder="Add a checklist item, e.g. Intro to Drew for editing" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" />
            <select name="area" className="h-8 rounded-md border bg-background px-1 text-xs">
              {["program", "content", "community", "amplifier", "career"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <button className="h-8 rounded-md border px-3 text-xs hover:bg-muted">Add</button>
          </form>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {STATUSES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PlanTab
        f={f}
        isTeam
        isSelf={false}
        asideTop={
          <>
            <section className="space-y-3 rounded-lg border bg-card p-3">
              <SectionTitle>How we can support</SectionTitle>
              {field("needs")}
              {field("nextStep")}
            </section>
            <section className="rounded-lg border bg-card p-3">
              <SectionTitle>After the fellowship</SectionTitle>
              <FellowField fellowId={f.id} field="prospects" value={f.prospects} />
            </section>
            <section className="rounded-lg border bg-card p-3">
              <SectionTitle hint="From the Frame Fellows calendar. Tick who came.">Events</SectionTitle>
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 text-sm">
                {past
                  .slice()
                  .reverse()
                  .map((e) => {
                    const st = status(e);
                    return (
                      <li key={e.id} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{eventDate(e.date)}</span>
                        <span className="min-w-0 flex-1 truncate" title={e.title}>
                          {e.title}
                          {e.tags.includes("mandatory") && <span className="ml-1 text-[10px] text-muted-foreground">mandatory</span>}
                        </span>
                        <form action={setResourceStatusAction.bind(null, f.id, e.id, st === "attended" ? "clear" : "attended")}>
                          <button title="Came" className={cn("grid size-6 place-items-center rounded border", st === "attended" || st === "liked" ? "border-transparent bg-good text-white" : "text-muted-foreground hover:text-foreground")}>
                            <Check className="size-3.5" />
                          </button>
                        </form>
                        <form action={setResourceStatusAction.bind(null, f.id, e.id, st === "missed" ? "clear" : "missed")}>
                          <button title="Missed" className={cn("grid size-6 place-items-center rounded border", st === "missed" ? "border-transparent bg-bad text-white" : "text-muted-foreground hover:text-foreground")}>
                            <X className="size-3.5" />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                {!past.length && <li className="text-xs text-muted-foreground">No program events yet.</li>}
              </ul>
            </section>
            <section className="rounded-lg border bg-card p-3">
              <SectionTitle hint="Concerns, wins, events and asks from Frame Slack channels">Seen on Slack</SectionTitle>
              <ul className="space-y-2 text-xs">
                {slack
                  .filter((m) => m.signals.some((x) => ["concern", "win", "event", "ask", "feedback"].includes(x)))
                  .slice(0, 5)
                  .map((m) => (
                    <li key={m.id} className="rounded-md bg-muted/60 px-2 py-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        {m.signals.map((x) => SLACK_SIGNALS.find((y) => y.slug === x)?.label).filter(Boolean).join(" · ")} · {shortDate(m.postedAt)}
                      </p>
                      <p className="line-clamp-3">{m.text}</p>
                    </li>
                  ))}
                {!slack.length && <li className="text-muted-foreground">{f.slackUserId ? "Nothing yet." : "Not linked to Slack yet (Team details → Slack user ID)."}</li>}
              </ul>
            </section>
          </>
        }
      >
        <section>
          <SectionTitle
            hint={latest ? `${shortDate(latest.date)} · Granola` : undefined}
            right={
              <Link href={`/fellows/${f.slug}?tab=notes`} className="text-xs text-muted-foreground hover:text-foreground">
                All notes →
              </Link>
            }
          >
            Latest 1:1
          </SectionTitle>
          {latest ? (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <p className="font-medium">
                {latest.title}
                {latest.url && (
                  <a href={latest.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground">
                    Granola <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
              {nextSteps(latest.body).length > 0 ? (
                <>
                  <p className="mt-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Next steps</p>
                  <ul className="mt-1 space-y-1">
                    {nextSteps(latest.body).map((s) => (
                      <li key={s} className="pl-3 before:mr-1.5 before:-ml-3 before:content-['•']">
                        {s}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                latest.body && <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">{latest.body.replace(/^#+ /gm, "").replace(/^\s*- /gm, "• ")}</p>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No 1:1 notes yet. Add one on the Notes tab.</p>
          )}
        </section>

        <section>
          <SectionTitle hint="1:1s, decisions, events, posts and Slack moments">Timeline</SectionTitle>
          <ol className="relative space-y-3 border-l pl-5">
            {timeline.map((x, i) => {
              const Icon = ICON[x.icon as keyof typeof ICON];
              const body = (
                <>
                  <p className="line-clamp-1 text-sm">{x.text}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {x.sub} · {shortDate(x.t)}
                  </p>
                </>
              );
              return (
                <li key={i} className="relative">
                  <span className="absolute top-0.5 -left-[29px] grid size-4.5 place-items-center rounded-full border bg-card">
                    <Icon className="size-2.5 text-muted-foreground" />
                  </span>
                  {x.href ? (
                    <a href={x.href} target={x.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="block hover:underline">
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
            {!timeline.length && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
          </ol>
        </section>

        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Impact detail: before / during / after, followers, outcomes</summary>
          <div className="border-t p-4">
            <OverviewTab f={f} cmp={cmp} isTeam />
          </div>
        </details>
      </PlanTab>
    </div>
  );
}
