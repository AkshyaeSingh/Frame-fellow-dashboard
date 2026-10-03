import type { Metadata } from "next";
import Link from "next/link";
import type { Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { compact, pct, shortDate } from "@/lib/format";
import { windowOf } from "@/lib/metrics";
import { CTAS, ORGS, PLATFORM_LABEL, TOPICS, labelOf } from "@/lib/taxonomy";
import { PlatformIcon } from "@/components/platform-icon";
import { Chip } from "@/components/bits";
import { FilterForm } from "@/components/filter-form";
import { CreatorAvatar } from "@/components/creator-avatar";
import { scoredPosts } from "@/lib/outliers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Content" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ContentPage(props: PageProps<"/content">) {
  const sp = await props.searchParams;
  const f = {
    q: one(sp.q),
    cohort: one(sp.cohort),
    platform: one(sp.platform),
    topic: one(sp.topic),
    cta: one(sp.cta),
    org: one(sp.org),
    ais: one(sp.ais),
    sort: one(sp.sort) ?? "date",
    out: one(sp.out),
    view: one(sp.view) ?? "grid",
    fellow: one(sp.fellow),
  };
  const where: Prisma.PostWhereInput = {
    ...(f.cohort && { fellow: { cohort: { slug: f.cohort } } }),
    ...(f.platform && f.platform in PLATFORM_LABEL && { platform: f.platform as Platform }),
    ...(f.topic && { topics: { has: f.topic } }),
    ...(f.cta && { ctas: { has: f.cta } }),
    ...(f.org && { orgsMentioned: { has: f.org } }),
    ...(f.ais === "1" && { isAiSafety: true }),
    ...(f.fellow && { fellow: { slug: f.fellow } }),
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { caption: { contains: f.q, mode: "insensitive" } },
        { transcript: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
  const out = f.out ? Number(f.out) : null;
  const [cohorts, total, scored] = await Promise.all([
    db.cohort.findMany({ orderBy: { startDate: "asc" } }),
    db.post.count({ where }),
    scoredPosts(where),
  ]);
  // Multiplier = views ÷ that account's usual (median of its previous 20 posts).
  const mult = new Map(scored.map((p) => [p.id, p]));
  const posts = (
    await db.post.findMany({
      where: out ? { id: { in: scored.filter((p) => p.multiplier >= out).map((p) => p.id) } } : where,
      orderBy: f.sort === "views" ? { views: { sort: "desc", nulls: "last" } } : { publishedAt: { sort: "desc", nulls: "last" } },
      take: out ? undefined : 240,
      include: { fellow: { select: { name: true, slug: true, cohort: { select: { startDate: true, endDate: true } } } } },
    })
  ).sort((a, b) => (out ? (mult.get(b.id)?.multiplier ?? 0) - (mult.get(a.id)?.multiplier ?? 0) : 0));
  const cohort = cohorts.find((c) => c.slug === f.cohort);
  // Per-fellow totals for the selected cohort since its start (the content board).
  const board = cohort
    ? await db.fellow.findMany({
        where: { cohortId: cohort.id },
        orderBy: { name: "asc" },
        select: {
          slug: true,
          name: true,
          cadenceScope: true,
          accounts: { select: { avatarUrl: true } },
          posts: { where: { publishedAt: { gte: cohort.startDate } }, select: { views: true, isAiSafety: true, publishedAt: true } },
        },
      })
    : [];
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/content?${p}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every scraped post across fellows. Search covers titles, captions and transcripts. <span className="font-medium text-foreground">×N</span> = views compared with that account&apos;s usual.
        </p>
      </div>
      <FilterForm
        values={f}
        selects={[
          { name: "cohort", label: "Cohort", options: cohorts.map((c) => [c.slug, c.name.split(" (")[0]!]) },
          { name: "platform", label: "Platform", options: Object.entries(PLATFORM_LABEL) },
          { name: "topic", label: "Topic", options: TOPICS.map((t) => [t.slug, t.label]) },
          { name: "cta", label: "CTA", options: CTAS.map((t) => [t.slug, t.label]) },
          { name: "org", label: "Org", options: ORGS.map((t) => [t.slug, t.label]) },
          { name: "ais", label: "Relevance", options: [["1", "AI safety only"]] },
          { name: "out", label: "Outliers", options: [["2", "≥ 2× usual"], ["3", "≥ 3× usual"], ["5", "≥ 5× usual"]] },
          { name: "sort", label: "Sort", options: [["date", "Newest"], ["views", "Most viewed"]], noEmpty: true },
        ]}
        keep={{ view: f.view, fellow: f.fellow }}
        count={`${out ? posts.length : total} posts${!out && total > 240 ? " · showing 240" : ""}`}
      />
      <div className="flex items-center justify-between">
        <div className="flex rounded-md border p-0.5 text-xs">
          {(["grid", "table"] as const).map((v) => (
            <Link key={v} href={qs({ view: v })} className={cn("rounded px-2 py-1 capitalize", f.view === v ? "bg-muted font-medium" : "text-muted-foreground")}>
              {v}
            </Link>
          ))}
        </div>
        {f.fellow && (
          <Link href={qs({ fellow: undefined })} className="text-xs text-muted-foreground hover:text-foreground">
            Showing one fellow · clear
          </Link>
        )}
      </div>

      {board.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {board.map((b) => {
            const ps = b.cadenceScope === "ai-safety" ? b.posts.filter((p) => p.isAiSafety) : b.posts;
            return (
              <Link
                key={b.slug}
                href={qs({ fellow: f.fellow === b.slug ? undefined : b.slug })}
                className={cn("flex min-w-44 items-center gap-2 rounded-lg border bg-card px-2.5 py-2 hover:border-foreground/30", f.fellow === b.slug && "border-foreground")}
              >
                <CreatorAvatar name={b.name} src={b.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-7 text-[10px]" />
                <div className="min-w-0 text-xs">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-muted-foreground">
                    {ps.length} posts · {compact(ps.reduce((a, p) => a + (p.views ?? 0), 0))} views
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {f.view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {posts.map((p) => {
            const m = mult.get(p.id);
            return (
              <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-lg border bg-card">
                <div className="relative aspect-[4/5] bg-muted">
                  {p.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- remote platform thumbnails
                    <img src={p.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
                  )}
                  {m && m.multiplier >= 2 && <span className="absolute top-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-good">{m.multiplier >= 10 ? Math.round(m.multiplier) : m.multiplier.toFixed(1)}×</span>}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-xs group-hover:underline">{p.title ?? p.caption ?? "Untitled"}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <PlatformIcon platform={p.platform} className="size-3" />
                    {p.fellow.name.split(" ")[0]} · {compact(p.views)} · {p.publishedAt ? shortDate(p.publishedAt).replace(/, \d{4}$/, "") : "–"}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Fellow</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Post</th>
              <th className="px-3 py-2 text-right font-medium">Views</th>
              <th className="px-3 py-2 text-right font-medium">vs usual</th>
              <th className="px-3 py-2 text-right font-medium">Eng.</th>
              <th className="px-3 py-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const w = windowOf(p.publishedAt, p.fellow.cohort.startDate, p.fellow.cohort.endDate);
              const eng = p.views ? ((p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0)) / p.views : null;
              return (
                <tr key={p.id} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/fellows/${p.fellow.slug}?tab=content`} className="font-medium hover:underline">
                      {p.fellow.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                    {p.publishedAt ? shortDate(p.publishedAt) : "—"}
                    {w && <span className={cn("mt-0.5 block w-fit rounded px-1 text-[10px]", w === "during" ? "bg-s4/20 text-foreground" : "bg-muted")}>{w}</span>}
                  </td>
                  <td className="max-w-lg px-3 py-2">
                    <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:underline">
                      <PlatformIcon platform={p.platform} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{p.title ?? p.caption ?? "(no caption)"}</span>
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{compact(p.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{mult.get(p.id) ? `${mult.get(p.id)!.multiplier.toFixed(1)}×` : "–"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(eng)}</td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-sm flex-wrap gap-1">
                      {p.isAiSafety && <Chip className="bg-s1/15 text-s1">AI safety</Chip>}
                      {p.topics.slice(0, 3).map((t) => (
                        <Chip key={t}>{labelOf(TOPICS, t)}</Chip>
                      ))}
                      {p.ctas.map((c) => (
                        <Chip key={c} className="bg-s3/15">→ {labelOf(CTAS, c)}</Chip>
                      ))}
                      {p.orgsMentioned.map((o) => (
                        <Chip key={o} className="bg-s7/10">{labelOf(ORGS, o)}</Chip>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
