import Link from "next/link";
import type { FellowFull } from "@/lib/data";
import { compact, pct, relativeDate, shortDate } from "@/lib/format";
import { coverageGaps, lift, weekly, WINDOW_LABEL, type compareWindows, type PostLike, type WindowStats } from "@/lib/metrics";
import { ATTRIBUTION, OUTCOME_TYPES, PLATFORM_LABEL, labelOf } from "@/lib/taxonomy";
import { FollowersChart, WeeklyViewsChart } from "@/components/charts";
import { Chip, Delta, Empty, PointDelta, SectionTitle } from "@/components/bits";
import { addOutcomeAction, deleteOutcomeAction, updateOutcomeAction } from "../../team-actions";

type Cmp = ReturnType<typeof compareWindows>;
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

const ROWS: { label: string; hint: string; get: (s: WindowStats) => number | null; fmt: (v: number | null) => string; share?: boolean }[] = [
  { label: "Posts", hint: "All posts published in the window", get: (s) => s.posts, fmt: (v) => (v == null ? "—" : String(v)) },
  { label: "Posts / week", hint: "Output cadence", get: (s) => s.postsPerWeek, fmt: (v) => (v == null ? "—" : v.toFixed(1)) },
  { label: "AI safety share", hint: "Share of posts tagged AI safety", get: (s) => s.aiSafetyShare, fmt: (v) => pct(v, 0), share: true },
  { label: "AI safety posts", hint: "Count of AI safety posts", get: (s) => s.aiSafetyPosts, fmt: (v) => (v == null ? "—" : String(v)) },
  { label: "AI safety views", hint: "Total views on AI safety posts", get: (s) => s.aiSafetyViews, fmt: compact },
  { label: "Median views (AI safety)", hint: "Typical AI safety post", get: (s) => s.medianAiSafetyViews, fmt: compact },
  { label: "Median views (all)", hint: "Typical post", get: (s) => s.medianViews, fmt: compact },
  { label: "Engagement rate", hint: "(likes + comments + shares) ÷ views", get: (s) => s.engagementRate, fmt: (v) => pct(v), share: true },
  { label: "Posts with action CTAs", hint: "Petition, lawmaker, course, career, tool, event, donate", get: (s) => s.actionCtaPosts, fmt: (v) => (v == null ? "—" : String(v)) },
  { label: "Est. AI safety viewer-minutes", hint: "views × typical watch share × length × relevance", get: (s) => s.viewerMinutes, fmt: compact },
];

export function OverviewTab({ f, cmp, isTeam }: { f: FellowFull; cmp: Cmp; isTeam: boolean }) {
  const posts = f.posts as (PostLike & (typeof f.posts)[number])[];
  const start = f.cohort.startDate;
  const end = f.cohort.endDate;
  const from = new Date(start.getTime() - 150 * 86_400_000);
  const weeks = weekly(posts, from, new Date());
  const windows = [{ from: start.getTime(), to: end.getTime(), label: "Fellowship" }];
  const followerSeries = f.accounts
    .map((a, i) => ({
      key: a.id,
      label: `${PLATFORM_LABEL[a.platform]} ${a.handle}`,
      color: SERIES[i % SERIES.length]!,
      points: a.snapshots.filter((s) => s.followers != null).map((s) => ({ t: s.takenAt.getTime(), v: s.followers!, source: s.source })),
    }))
    .filter((s) => s.points.length);
  const duringTop = posts
    .filter((p) => p.publishedAt && p.publishedAt >= start && p.publishedAt <= end)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);
  const gaps = coverageGaps(f.posts, start);
  const handleOf = (id: string) => {
    const a = f.accounts.find((x) => x.id === id);
    return a ? `${PLATFORM_LABEL[a.platform]} ${a.handle}` : id;
  };
  // Fellows' own counterfactual answers, with the exact question asked (never the anonymous survey).
  const counterfactuals = f.responses
    .flatMap((r) => (r.answers as { q: string; a: string; group: string }[]).filter((x) => x.group === "counterfactual"))
    .filter((x) => x.a.trim().length > 3);
  const onboarding = f.responses.find((r) => r.form === "onboarding");
  const selfMetrics = (onboarding?.answers as { q: string; a: string }[] | undefined)?.find((x) => /channel metrics/i.test(x.q))?.a;

  return (
    <div className="space-y-8">
      {!posts.length && <Empty>No posts scraped for {f.name} yet. {isTeam ? "Add or fix handles on the Data page, then run a scrape." : ""}</Empty>}

      {gaps.length > 0 && (
        <div className="rounded-lg border border-s4/50 bg-s4/10 px-4 py-3 text-sm">
          <p className="font-medium">Baseline coverage is incomplete</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {gaps.map((g) => (
              <li key={g.accountId}>
                {handleOf(g.accountId)}: earliest scraped post {shortDate(g.earliest)} ({g.posts} posts) —{" "}
                {g.likelyTruncated ? "history was likely cut off by the scrape limit; re-scrape with a higher limit." : "account appears to be new or was inactive before this."}
              </li>
            ))}
          </ul>
        </div>
      )}

      {posts.length > 0 && (
        <section>
          <SectionTitle hint={`Baseline = the 90 days before ${shortDate(start)}. ${cmp.afterMaturing ? "The 'after' window is recent — views are still accruing." : ""}`}>
            Before / during / after
          </SectionTitle>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 text-right font-medium">{WINDOW_LABEL.baseline}</th>
                  <th className="px-3 py-2 text-right font-medium">{WINDOW_LABEL.during}</th>
                  <th className="px-3 py-2 text-right font-medium">Change</th>
                  <th className="px-3 py-2 text-right font-medium">{cmp.after ? `After (${cmp.after.days}d)` : "After"}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const b = r.get(cmp.baseline);
                  const d = r.get(cmp.during);
                  const a = cmp.after ? r.get(cmp.after) : null;
                  return (
                    <tr key={r.label} className="border-b last:border-0" title={r.hint}>
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.fmt(b)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{r.fmt(d)}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{r.share ? <PointDelta from={b} to={d} /> : <Delta value={lift(d, b)} />}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{cmp.after ? r.fmt(a) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <SectionTitle hint="Weekly views on posts published that week; shaded = fellowship.">Trajectory</SectionTitle>
          {posts.length ? <WeeklyViewsChart data={weeks} windows={windows} height={220} /> : <Empty>No data</Empty>}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <SectionTitle hint="Each point is a scrape or a self-report. More points accrue with every scheduled scrape.">Followers</SectionTitle>
          {followerSeries.some((x) => x.points.length > 1) ? (
            <FollowersChart series={followerSeries} windows={windows} />
          ) : followerSeries.length ? (
            <div>
              <ul className="space-y-1 text-sm">
                {followerSeries.map((x) => (
                  <li key={x.key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{x.label}</span>
                    <span className="font-medium tabular-nums">{compact(x.points.at(-1)!.v)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">One snapshot so far — the trajectory line appears after the next scheduled scrape.</p>
            </div>
          ) : (
            <Empty>No follower snapshots yet</Empty>
          )}
          {selfMetrics && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">Self-reported channel metrics at onboarding</summary>
              <p className="mt-2 whitespace-pre-line">{selfMetrics}</p>
            </details>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section>
          <SectionTitle hint="Would this have happened without Frame? Attribute each outcome with evidence.">Outcomes</SectionTitle>
          <div className="space-y-2">
            {f.outcomes.map((o) => (
              <div key={o.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {o.url ? (
                        <a href={o.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {o.title}
                        </a>
                      ) : (
                        o.title
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(OUTCOME_TYPES, o.type)} · {o.date ? shortDate(o.date) : "undated"} · source: {o.source}
                    </p>
                  </div>
                  <Chip className={o.attribution === "direct" ? "bg-good/15 text-good" : o.attribution === "contributed" ? "bg-s1/15 text-s1" : ""} title={ATTRIBUTION[(o.attribution ?? "unknown") as keyof typeof ATTRIBUTION]?.hint}>
                    {ATTRIBUTION[(o.attribution ?? "unknown") as keyof typeof ATTRIBUTION]?.label ?? o.attribution}
                  </Chip>
                </div>
                {o.detail && <p className="mt-2 whitespace-pre-line text-sm">{o.detail}</p>}
                {o.evidence && <p className="mt-2 border-l-2 pl-2 text-xs text-muted-foreground">Evidence: {o.evidence}</p>}
                {isTeam && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Edit attribution</summary>
                    <form action={updateOutcomeAction.bind(null, o.id)} className="mt-2 grid gap-2 sm:grid-cols-[10rem_10rem_1fr_auto]">
                      <select name="type" defaultValue={o.type} className="h-8 rounded-md border bg-background px-2 text-xs">
                        {OUTCOME_TYPES.map((t) => (
                          <option key={t.slug} value={t.slug}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <select name="attribution" defaultValue={o.attribution ?? "unknown"} className="h-8 rounded-md border bg-background px-2 text-xs">
                        {Object.entries(ATTRIBUTION).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <input name="evidence" defaultValue={o.evidence ?? ""} placeholder="Evidence (quote, link, reasoning)" className="h-8 rounded-md border bg-background px-2 text-xs" />
                      <button className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground">Save</button>
                    </form>
                    <form action={deleteOutcomeAction.bind(null, o.id)} className="mt-1">
                      <button className="text-xs text-muted-foreground hover:text-bad">Delete outcome</button>
                    </form>
                  </details>
                )}
              </div>
            ))}
            {!f.outcomes.length && <Empty>No outcomes logged yet.</Empty>}
            {isTeam && (
              <details className="rounded-lg border border-dashed p-3">
                <summary className="cursor-pointer text-sm font-medium">+ Log an outcome</summary>
                <form action={addOutcomeAction.bind(null, f.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input name="title" required placeholder="What happened (e.g. CBS interview about protest walk)" className="h-8 rounded-md border bg-background px-2 text-sm sm:col-span-2" />
                  <select name="type" className="h-8 rounded-md border bg-background px-2 text-sm">
                    {OUTCOME_TYPES.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input name="date" type="date" className="h-8 rounded-md border bg-background px-2 text-sm" />
                  <input name="url" type="url" placeholder="Link" className="h-8 rounded-md border bg-background px-2 text-sm sm:col-span-2" />
                  <select name="attribution" defaultValue="unknown" className="h-8 rounded-md border bg-background px-2 text-sm">
                    {Object.entries(ATTRIBUTION).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} — {v.hint}
                      </option>
                    ))}
                  </select>
                  <input name="evidence" placeholder="Evidence for attribution" className="h-8 rounded-md border bg-background px-2 text-sm" />
                  <textarea name="detail" placeholder="Details" className="min-h-16 rounded-md border bg-background px-2 py-1 text-sm sm:col-span-2" />
                  <button className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground sm:w-fit">Add outcome</button>
                </form>
              </details>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <SectionTitle>Counterfactual & intent</SectionTitle>
            <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
              {counterfactuals.length ? (
                counterfactuals.map((c) => <Block key={c.q} label={c.q} text={c.a} />)
              ) : (
                <Block label="Counterfactual (their words)" text={f.counterfactual} />
              )}
              <Block label="Goals at intake" text={f.goals} />
              <Block label="Planned output" text={f.plannedOutput} footer={posts.length ? `Actual during fellowship so far: ${cmp.during.posts} posts (${cmp.during.aiSafetyPosts} AI safety)` : undefined} />
            </div>
          </div>
          <div>
            <SectionTitle hint="Highest-view posts published during the fellowship.">Top posts during</SectionTitle>
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {duringTop.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{compact(p.views)}</span>
                  <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                    {p.title ?? p.caption?.slice(0, 100) ?? "(untitled)"}
                  </a>
                  {p.isAiSafety && <Chip className="bg-s1/15 text-s1">AI safety</Chip>}
                </li>
              ))}
              {!duringTop.length && <li className="px-3 py-6 text-center text-xs text-muted-foreground">Nothing published during the window yet.</li>}
            </ul>
            <Link href={`/fellows/${f.slug}?tab=content`} className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground">
              All content →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Last scraped {relativeDate(f.accounts.map((a) => a.lastScrapedAt).filter(Boolean).sort().at(-1) ?? null)}.</p>
        </section>
      </div>
    </div>
  );
}

function Block({ label, text, footer }: { label: string; text: string | null; footer?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-6 whitespace-pre-line">{text ?? <span className="text-muted-foreground">Not captured</span>}</p>
      {footer && <p className="mt-1 text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}
