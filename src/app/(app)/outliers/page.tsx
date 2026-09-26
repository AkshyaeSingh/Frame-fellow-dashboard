import type { Metadata } from "next";
import Link from "next/link";
import type { Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { compact, shortDate } from "@/lib/format";
import { windowOf, WINDOW_LABEL } from "@/lib/metrics";
import { scoredPosts } from "@/lib/outliers";
import { PLATFORM_LABEL, TOPICS, labelOf } from "@/lib/taxonomy";
import { PlatformIcon } from "@/components/platform-icon";
import { Chip, Empty } from "@/components/bits";
import { FilterForm } from "@/components/filter-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Outliers" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function OutliersPage(props: PageProps<"/outliers">) {
  const sp = await props.searchParams;
  const f = {
    q: one(sp.q),
    cohort: one(sp.cohort),
    platform: one(sp.platform),
    ais: one(sp.ais),
    min: one(sp.min) ?? "3",
    dir: one(sp.dir) ?? "over",
    when: one(sp.when),
  };
  const where: Prisma.PostWhereInput = {
    ...(f.cohort && { fellow: { cohort: { slug: f.cohort } } }),
    ...(f.platform && f.platform in PLATFORM_LABEL && { platform: f.platform as Platform }),
    ...(f.ais === "1" && { isAiSafety: true }),
    ...(f.q && { OR: [{ title: { contains: f.q, mode: "insensitive" } }, { caption: { contains: f.q, mode: "insensitive" } }, { transcript: { contains: f.q, mode: "insensitive" } }] }),
  };
  const [cohorts, all] = await Promise.all([db.cohort.findMany({ orderBy: { startDate: "asc" } }), scoredPosts(where)]);
  const min = Number(f.min);
  const rows = all
    .map((p) => ({ ...p, window: windowOf(p.publishedAt, p.fellow.cohort.startDate, p.fellow.cohort.endDate) }))
    .filter((p) => (f.dir === "under" ? p.multiplier <= 1 / min && !p.maturing : p.multiplier >= min))
    .filter((p) => !f.when || p.window === f.when)
    .sort((a, b) => (f.dir === "under" ? a.multiplier - b.multiplier : b.multiplier - a.multiplier))
    .slice(0, 200);

  // What distinguishes outliers: topic frequency among outliers vs. all scored posts.
  const share = (xs: typeof all, t: string) => (xs.length ? xs.filter((p) => p.topics.includes(t)).length / xs.length : 0);
  const topicLift = TOPICS.map((t) => ({ t, out: share(rows, t.slug), base: share(all, t.slug) }))
    .filter((x) => x.out >= 0.1 && x.base > 0)
    .map((x) => ({ ...x, ratio: x.out / x.base }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Outliers</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Posts that beat (or missed) the creator&apos;s own normal. Multiplier = views ÷ median views of that account&apos;s previous 20 posts, so it controls for
          audience size. Posts under {7} days old are still collecting views and are marked <em>maturing</em>.
        </p>
      </div>
      <FilterForm
        values={f}
        selects={[
          { name: "dir", label: "Direction", options: [["over", "Overperformers"], ["under", "Underperformers"]], noEmpty: true },
          { name: "min", label: "Threshold", options: [["2", "≥ 2×"], ["3", "≥ 3×"], ["5", "≥ 5×"], ["10", "≥ 10×"]], noEmpty: true },
          { name: "cohort", label: "Cohort", options: cohorts.map((c) => [c.slug, c.name.split(" (")[0]!]) },
          { name: "platform", label: "Platform", options: Object.entries(PLATFORM_LABEL) },
          { name: "when", label: "Window", options: [["baseline", "Before fellowship"], ["during", "During"], ["after", "After"]] },
          { name: "ais", label: "Relevance", options: [["1", "AI safety only"]] },
        ]}
        count={`${rows.length} posts of ${all.length} scored`}
      />
      {topicLift.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Over-represented among these:
          {topicLift.map((x) => (
            <Chip key={x.t.slug} title={`${Math.round(x.out * 100)}% of these vs ${Math.round(x.base * 100)}% of all posts`}>
              {x.t.label} {x.ratio.toFixed(1)}×
            </Chip>
          ))}
        </p>
      )}
      {!rows.length ? (
        <Empty>No posts match. Try a lower threshold.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right font-medium">Multiplier</th>
                <th className="px-3 py-2 font-medium">Fellow</th>
                <th className="px-3 py-2 font-medium">Post</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
                <th className="px-3 py-2 text-right font-medium">Their usual</th>
                <th className="px-3 py-2 font-medium">Window</th>
                <th className="px-3 py-2 font-medium">Topics</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-3 py-2 text-right">
                    <span className={cn("font-semibold tabular-nums", p.multiplier >= 1 ? "text-good" : "text-bad")}>
                      {p.multiplier >= 10 ? Math.round(p.multiplier) : p.multiplier.toFixed(1)}×
                    </span>
                    {p.maturing && <span className="block text-[10px] text-muted-foreground">maturing</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/fellows/${p.fellow.slug}`} className="font-medium hover:underline">
                      {p.fellow.name}
                    </Link>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PlatformIcon platform={p.platform} className="size-3" /> {p.account.handle}
                    </span>
                  </td>
                  <td className="max-w-md px-3 py-2">
                    <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:underline">
                      {p.title ?? p.caption ?? "Untitled"}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {shortDate(p.publishedAt)}
                      {p.isAiSafety && " · AI safety"}
                      {p.kind && ` · ${p.kind}`}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{compact(p.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{compact(p.baseline)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{p.window && p.window !== "earlier" ? WINDOW_LABEL[p.window] : "Earlier"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.topics.slice(0, 3).map((t) => (
                        <Chip key={t}>{labelOf(TOPICS, t)}</Chip>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
