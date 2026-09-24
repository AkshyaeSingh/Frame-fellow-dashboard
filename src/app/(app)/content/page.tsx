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
    sort: one(sp.sort) ?? "views",
  };
  const where: Prisma.PostWhereInput = {
    ...(f.cohort && { fellow: { cohort: { slug: f.cohort } } }),
    ...(f.platform && f.platform in PLATFORM_LABEL && { platform: f.platform as Platform }),
    ...(f.topic && { topics: { has: f.topic } }),
    ...(f.cta && { ctas: { has: f.cta } }),
    ...(f.org && { orgsMentioned: { has: f.org } }),
    ...(f.ais === "1" && { isAiSafety: true }),
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { caption: { contains: f.q, mode: "insensitive" } },
        { transcript: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
  const [cohorts, total, posts] = await Promise.all([
    db.cohort.findMany({ orderBy: { startDate: "asc" } }),
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: f.sort === "date" ? { publishedAt: { sort: "desc", nulls: "last" } } : { views: { sort: "desc", nulls: "last" } },
      take: 250,
      include: { fellow: { select: { name: true, slug: true, cohort: { select: { startDate: true, endDate: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">All fellow content</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every scraped post across fellows. Search covers titles, captions and transcripts.</p>
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
          { name: "sort", label: "Sort", options: [["views", "Most viewed"], ["date", "Newest"]], noEmpty: true },
        ]}
        count={`${total} posts${total > 250 ? " · showing 250" : ""}`}
      />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Fellow</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Post</th>
              <th className="px-3 py-2 text-right font-medium">Views</th>
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
    </div>
  );
}
