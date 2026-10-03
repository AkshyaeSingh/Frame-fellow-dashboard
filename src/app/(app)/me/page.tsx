import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFellow } from "@/lib/data";
import { compact, shortDate } from "@/lib/format";
import { cadence, fmtTarget } from "@/lib/program";
import { planOf } from "@/lib/program-data";
import { recommendationsFor } from "@/lib/recommend";
import { FIELD_DEFS, type FieldKey } from "@/lib/fellow-fields";
import { FellowField } from "@/components/fellow-field";
import { AccountsEditor } from "@/components/accounts-editor";
import { ChangePassword } from "@/components/change-password";
import { HealthBadge } from "@/components/health-badge";
import { ResourceCard } from "@/components/resource-card";
import { PlatformIcon } from "@/components/platform-icon";
import { SectionTitle } from "@/components/bits";
import { cn } from "@/lib/utils";
import { OpportunitiesTab } from "../fellows/[slug]/opportunities-tab";
import { setResourceStatusAction } from "../program-actions";

export const metadata: Metadata = { title: "My week" };

// A fellow's home: am I on track, what's next, what's worth my time, and how
// is my content landing. Everything editable lives under "Your info".
export default async function MyWeekPage() {
  const s = await getSession();
  if (s?.role !== "fellow") redirect(s ? "/" : "/login");
  const me = await db.fellow.findUniqueOrThrow({ where: { id: s.fellowId }, select: { slug: true } });
  const f = (await getFellow(me.slug))!;
  const [weeks, shared, recs, comments] = await Promise.all([
    db.cadenceWeek.findMany({ where: { fellowId: f.id }, select: { week: true, long: true, short: true, note: true } }),
    db.fellowNote.findMany({ where: { fellowId: f.id, shared: true }, orderBy: [{ done: "asc" }, { date: { sort: "desc", nulls: "last" } }], take: 6 }),
    recommendationsFor(f.id, 3),
    db.comment.findMany({
      where: { fellowId: f.id, isCreator: false, post: { publishedAt: { gte: f.cohort.startDate } }, OR: [{ signals: { hasSome: ["changed-mind", "learned", "action"] } }, { sentiment: "positive" }] },
      orderBy: { likes: { sort: "desc", nulls: "last" } },
      take: 3,
      select: { id: true, text: true, likes: true, post: { select: { url: true } } },
    }),
  ]);
  const c = cadence(planOf({ ...f, cadenceWeeks: weeks }), f.posts, f.cohort.startDate, f.cohort.endDate);
  const mine = f.posts.filter((p) => p.publishedAt && p.publishedAt >= f.cohort.startDate);
  const best = [...mine].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const field = (k: FieldKey) => (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{FIELD_DEFS[k].label}</p>
      <FellowField fellowId={f.id} field={k} value={f[k] as string | number | string[] | null} />
      {FIELD_DEFS[k].help && <p className="px-1 text-[11px] text-muted-foreground/80">{FIELD_DEFS[k].help}</p>}
    </div>
  );
  const inWeek = c.currentWeek >= 1 && c.currentWeek <= c.totalWeeks;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {f.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {inWeek ? `Week ${c.currentWeek} of ${c.totalWeeks}` : c.currentWeek < 1 ? "The fellowship hasn't started yet" : "The fellowship has finished"} · {f.cohort.name.split(" (")[0]}
          </p>
        </div>
        <HealthBadge health={c.health} pace={c.pace} className="text-sm" />
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <Progress title="This week" rows={[
          { label: "Long-form", actual: c.thisWeek?.long.actual ?? 0, target: c.thisWeek?.long.target ?? null },
          { label: "Short-form", actual: c.thisWeek?.short.actual ?? 0, target: c.thisWeek?.short.target ?? null },
        ]} />
        <Progress title="Fellowship so far" rows={[
          { label: "Long-form", actual: c.toDate.long.actual, target: c.toDate.long.programTarget, expected: c.toDate.long.expected },
          { label: "Short-form", actual: c.toDate.short.actual, target: c.toDate.short.programTarget, expected: c.toDate.short.expected },
        ]} />
      </section>
      {c.health === "no-plan" && (
        <p className="-mt-5 text-xs text-muted-foreground">No cadence plan yet. Set your weekly targets under Your info, or agree them with the Frame team.</p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle hint="Decisions and next steps from your check-ins">From Frame</SectionTitle>
          <ul className="space-y-2">
            {shared.map((n) => (
              <li key={n.id} className="rounded-lg border bg-card px-3 py-2">
                <p className={cn("text-sm font-medium", n.done && "text-muted-foreground line-through")}>{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-3 text-xs whitespace-pre-wrap text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">{shortDate(n.date)}</p>
              </li>
            ))}
            {!shared.length && <li className="text-sm text-muted-foreground">Nothing yet. Notes from your 1:1s show up here.</li>}
          </ul>
        </section>

        <section>
          <SectionTitle hint="Matched to your interests and what you post about">Worth your time</SectionTitle>
          <div className="space-y-2">
            {recs.map((x) => (
              <ResourceCard key={x.resource.id} r={x.resource} reasons={x.reasons}>
                <div className="mt-1 flex gap-1">
                  {[
                    ["interested", "Interested"],
                    ["attended", "Went"],
                    ["not-relevant", "Not for me"],
                  ].map(([k, l]) => (
                    <form key={k} action={setResourceStatusAction.bind(null, f.id, x.resource.id, x.status === k ? "clear" : k!)}>
                      <button className={cn("rounded border px-2 py-0.5 text-xs", x.status === k ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                    </form>
                  ))}
                </div>
              </ResourceCard>
            ))}
            {!recs.length && <p className="text-sm text-muted-foreground">Add a few interests under Your info to get recommendations.</p>}
          </div>
        </section>
      </div>

      <section>
        <SectionTitle
          right={
            <Link href={`/fellows/${f.slug}?tab=content`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              All your posts & audience <ArrowRight className="size-3" />
            </Link>
          }
        >
          Your content this fellowship
        </SectionTitle>
        {mine.length ? (
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {mine.slice(0, 6).map((p) => (
                <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-md border bg-card">
                  <div className="aspect-[4/5] bg-muted">
                    {p.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- remote platform thumbnails
                      <img src={p.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
                    )}
                  </div>
                  <p className="flex items-center gap-1 px-1.5 py-1 text-[11px] text-muted-foreground">
                    <PlatformIcon platform={p.platform} className="size-3" /> {compact(p.views)}
                  </p>
                </a>
              ))}
            </div>
            <div className="space-y-3">
              {best && (
                <div className="rounded-lg border bg-card p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Best performer</p>
                  <a href={best.url ?? "#"} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:underline">
                    {best.title ?? best.caption ?? "Untitled"}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {compact(best.views)} views · {shortDate(best.publishedAt)}
                  </p>
                </div>
              )}
              {comments.length > 0 && (
                <div className="rounded-lg border bg-card p-3">
                  <p className="mb-1 text-xs text-muted-foreground">What your audience said</p>
                  <ul className="space-y-2 text-sm">
                    {comments.map((cm) => (
                      <li key={cm.id}>
                        <p className="line-clamp-3">“{cm.text}”</p>
                        {cm.likes ? (
                          <p className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Heart className="size-3" /> {compact(cm.likes)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No posts found since {shortDate(f.cohort.startDate)}. If you&apos;re posting somewhere we don&apos;t track, add the account under Your info.
          </p>
        )}
      </section>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">More opportunities & log an event</summary>
        <div className="border-t p-4">
          <OpportunitiesTab fellowId={f.id} isTeam={false} canEdit />
        </div>
      </details>

      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Your info: profile, plan, accounts & password</summary>
        <div className="grid gap-6 border-t p-4 md:grid-cols-2">
          <div className="space-y-3">
            {field("about")}
            {field("interests")}
            {field("programGoals")}
            {field("fellowNotes")}
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-3">
              <SectionTitle>Cadence plan</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {field("longPerWeek")}
                {field("shortPerWeek")}
                {field("programLong")}
                {field("programShort")}
              </div>
              <div className="mt-3">{field("cadenceNote")}</div>
            </div>
            <AccountsEditor fellowId={f.id} accounts={f.accounts} postAccountIds={f.posts.map((p) => p.accountId)} isTeam={false} isSelf />
            <div className="rounded-lg border bg-card p-3">
              <SectionTitle hint={`You sign in as “${f.username}”.`}>Password</SectionTitle>
              <ChangePassword />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function Progress({ title, rows }: { title: string; rows: { label: string; actual: number; target: number | null; expected?: number | null }[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="space-y-3">
        {rows.map((r) => {
          const max = Math.max(r.target ?? 0, r.actual, 1);
          const ok = r.expected != null ? r.actual >= r.expected * 0.8 : r.target != null && r.actual >= r.target;
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{r.label}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{r.actual}</span>
                  <span className="text-muted-foreground"> / {fmtTarget(r.target)}</span>
                </span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-muted">
                <div className={cn("h-full rounded-full", r.target == null ? "bg-muted-foreground/40" : ok ? "bg-good" : "bg-s4")} style={{ width: `${Math.min(100, (r.actual / max) * 100)}%` }} />
                {r.expected != null && r.target != null && (
                  <div className="absolute top-[-3px] h-[14px] w-0.5 bg-foreground/60" style={{ left: `${Math.min(100, (r.expected / max) * 100)}%` }} title={`Expected by now: ${fmtTarget(Math.round(r.expected * 10) / 10)}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {rows.some((r) => r.expected != null) && <p className="mt-2 text-[11px] text-muted-foreground">The tick marks where you&apos;d be on plan by now.</p>}
    </div>
  );
}
