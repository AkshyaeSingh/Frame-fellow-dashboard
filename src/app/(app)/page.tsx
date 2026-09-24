import Link from "next/link";
import { db } from "@/lib/db";
import { getPortfolio, postLikeSelect } from "@/lib/data";
import { compact, pct } from "@/lib/format";
import { lift, weekly, type PostLike } from "@/lib/metrics";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { CreatorAvatar } from "@/components/creator-avatar";
import { PlatformIcon } from "@/components/platform-icon";
import { WeeklyViewsChart } from "@/components/charts";
import { Delta, Empty, PointDelta, SectionTitle, StatTile } from "@/components/bits";
import { cn } from "@/lib/utils";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function OverviewPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const cohorts = await db.cohort.findMany({ orderBy: { startDate: "asc" } });
  const sel = one(sp.cohort) ?? "all";
  // Tracked fellows first (by followers), untracked after.
  const rows = (await getPortfolio())
    .filter((r) => sel === "all" || r.fellow.cohort.slug === sel)
    .sort((a, b) => Number(b.totalPosts > 0) - Number(a.totalPosts > 0) || b.followers - a.followers);
  const tracked = rows.filter((r) => r.totalPosts > 0);

  // Pooled totals
  const sumW = (k: "baseline" | "during", f: (s: NonNullable<(typeof rows)[number]["cmp"]["during"]>) => number) =>
    tracked.reduce((s, r) => s + f(r.cmp[k]), 0);
  const duringPosts = sumW("during", (s) => s.posts);
  const duringAis = sumW("during", (s) => s.aiSafetyPosts);
  const basePosts = sumW("baseline", (s) => s.posts);
  const baseAis = sumW("baseline", (s) => s.aiSafetyPosts);
  const duringAisViews = sumW("during", (s) => s.aiSafetyViews);
  const baseAisViews = sumW("baseline", (s) => s.aiSafetyViews);
  const duringVm = sumW("during", (s) => s.viewerMinutes);
  const outcomes = rows.reduce((s, r) => s + r.fellow._count.outcomes, 0);
  const cadenceLifts = tracked
    .map((r) => lift(r.cmp.during.postsPerWeek, r.cmp.baseline.postsPerWeek))
    .filter((x): x is number => x != null && Number.isFinite(x))
    .sort((a, b) => a - b);
  const medianCadenceLift = cadenceLifts.length ? cadenceLifts[Math.floor(cadenceLifts.length / 2)]! : null;

  // Weekly chart across selected fellows
  const posts = (await db.post.findMany({
    where: { fellow: sel === "all" ? {} : { cohort: { slug: sel } } },
    select: postLikeSelect,
  })) as PostLike[];
  const from = new Date(Math.min(...(sel === "all" ? cohorts : cohorts.filter((c) => c.slug === sel)).map((c) => c.startDate.getTime() - 120 * 86_400_000)));
  const weeks = weekly(posts, from, new Date());
  const windows = (sel === "all" ? cohorts : cohorts.filter((c) => c.slug === sel)).map((c) => ({ from: c.startDate.getTime(), to: c.endDate.getTime(), label: c.name }));

  const anon = sel !== "cohort-2" ? await db.cohortSurvey.findMany({ where: { cohortSlug: "cohort-1" } }) : [];
  const anonQ = (re: RegExp) =>
    anon.map((r) => (r.answers as { q: string; a: string }[]).find((x) => re.test(x.q))?.a).filter((x): x is string => !!x);
  const grantAnswers = anonQ(/more valuable than just receiving a grant/i);
  const ratings = anonQ(/^Overall, how would you rate/i).map(Number).filter((n) => !isNaN(n));
  const recommend = anonQ(/Would you recommend/i).map(Number).filter((n) => !isNaN(n));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fellow portfolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            What every fellow published before, during and after Frame — scraped across platforms, tagged for AI safety
            relevance, topics and calls to action. Compare windows to see what changed.
          </p>
        </div>
        <div className="flex gap-1 text-sm">
          {[{ slug: "all", name: "All cohorts" }, ...cohorts.map((c) => ({ slug: c.slug, name: c.name.split(" (")[0]! }))].map((c) => (
            <Link
              key={c.slug}
              href={c.slug === "all" ? "/" : `/?cohort=${c.slug}`}
              className={cn("rounded-md border px-3 py-1", sel === c.slug ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Fellows with tracked content" value={`${tracked.length}/${rows.length}`} sub={`${compact(tracked.reduce((s, r) => s + r.totalPosts, 0))} posts tracked`} />
        <StatTile
          label="AI safety share of output"
          value={duringPosts ? pct(duringAis / duringPosts, 0) : "—"}
          sub={
            <>
              during vs {basePosts ? pct(baseAis / basePosts, 0) : "—"} before · <PointDelta from={basePosts ? baseAis / basePosts : null} to={duringPosts ? duringAis / duringPosts : null} />
            </>
          }
          hint="Share of posts tagged AI safety, pooled across fellows"
        />
        <StatTile label="AI safety views during" value={compact(duringAisViews)} sub={<>vs {compact(baseAisViews)} in the 90 days before · <Delta value={lift(duringAisViews, baseAisViews)} /></>} />
        <StatTile label="Median cadence change" value={<Delta value={medianCadenceLift} className="text-2xl" />} sub="posts/week, during vs before (per fellow)" />
        <StatTile label="Est. AI safety viewer-minutes" value={compact(duringVm)} sub="during fellowship · see methodology" hint="views × typical watch share × length × AI-safety relevance" />
        <StatTile label="Outcomes logged" value={outcomes} sub="press, collabs, grants, jobs…" />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <SectionTitle hint="Weekly views of posts published that week (views keep accruing, so recent weeks are still maturing).">Output over time</SectionTitle>
        <WeeklyViewsChart data={weeks} windows={windows} />
      </section>

      <section>
        <SectionTitle hint="Baseline = 90 days before the fellowship. Click a fellow for the full profile.">Fellows</SectionTitle>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fellow</th>
                <th className="px-3 py-2 font-medium">Track</th>
                <th className="px-3 py-2 font-medium">Platforms</th>
                <th className="px-3 py-2 text-right font-medium">Followers</th>
                <th className="px-3 py-2 text-right font-medium" title="Posts per week: before → during">Cadence</th>
                <th className="px-3 py-2 text-right font-medium" title="Share of posts about AI safety: before → during → after">AI safety share</th>
                <th className="px-3 py-2 text-right font-medium" title="Median views of AI safety posts during the fellowship vs before">Median AIS views</th>
                <th className="px-3 py-2 text-right font-medium" title="Posts asking for real-world action (petition, lawmaker, course…) during">Action CTAs</th>
                <th className="px-3 py-2 text-right font-medium">Outcomes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ fellow: f, cmp, followers, totalPosts, truncated }) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-2">
                    <Link href={`/fellows/${f.slug}`} className="flex items-center gap-2.5">
                      <CreatorAvatar name={f.name} src={f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-7 text-[10px]" />
                      <span>
                        <span className="font-medium hover:underline">{f.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {f.cohort.name.split(" (")[0]}
                          {truncated && (
                            <span className="ml-1.5 rounded bg-s4/25 px-1 text-foreground" title="Scraped history doesn't reach the baseline window for at least one account — before/after comparisons are incomplete.">
                              ⚠ partial baseline
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {f.track ?? "—"}
                    {f.partnerOrg && <span className="block text-muted-foreground">↔ {f.partnerOrg}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex gap-1.5 text-foreground/70">
                      {f.accounts.map((a) => (
                        <span key={a.id} title={`${PLATFORM_LABEL[a.platform]} ${a.handle}`}>
                          <PlatformIcon platform={a.platform} />
                        </span>
                      ))}
                      {!f.accounts.length && <span className="text-xs text-muted-foreground">no handles yet</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{followers ? compact(followers) : "—"}</td>
                  {totalPosts ? (
                    <>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {cmp.baseline.postsPerWeek.toFixed(1)} → {cmp.during.postsPerWeek.toFixed(1)}
                        <span className="block">
                          <Delta value={lift(cmp.during.postsPerWeek, cmp.baseline.postsPerWeek)} />
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {pct(cmp.baseline.aiSafetyShare, 0)} → {pct(cmp.during.aiSafetyShare, 0)}
                        {cmp.after && <> → {pct(cmp.after.aiSafetyShare, 0)}</>}
                        <span className="block">
                          <PointDelta from={cmp.baseline.aiSafetyShare} to={cmp.during.aiSafetyShare} />
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {compact(cmp.baseline.medianAiSafetyViews)} → {compact(cmp.during.medianAiSafetyViews)}
                        <span className="block">
                          <Delta value={lift(cmp.during.medianAiSafetyViews, cmp.baseline.medianAiSafetyViews)} />
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{cmp.during.actionCtaPosts}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {f.accounts.length ? "No posts scraped yet" : "Add handles to start tracking"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right tabular-nums">{f._count.outcomes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {anon.length > 0 && (
        <section>
          <SectionTitle hint={`Anonymous exit survey, cohort 1 (n=${anon.length}). Never linked to individual fellows.`}>Fellows&apos; own counterfactual view</SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <StatTile label="Overall rating" value={ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}/10` : "—"} />
            <StatTile label="Would recommend to a creator they respect" value={recommend.length ? `${(recommend.reduce((a, b) => a + b, 0) / recommend.length).toFixed(1)}/10` : "—"} />
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">More valuable than just receiving a grant?</p>
              {grantAnswers.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {Object.entries(grantAnswers.reduce<Record<string, number>>((m, a) => ((m[a] = (m[a] ?? 0) + 1), m), {}))
                    .sort((a, b) => b[1] - a[1])
                    .map(([a, n]) => (
                      <li key={a} className="flex justify-between gap-3">
                        <span>{a}</span>
                        <span className="tabular-nums text-muted-foreground">{n}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <Empty>No responses</Empty>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
