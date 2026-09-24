import Link from "next/link";
import type { FellowFull } from "@/lib/data";
import { compact, pct, shortDate } from "@/lib/format";
import { windowOf } from "@/lib/metrics";
import { CTAS, ORGS, TOPICS, labelOf } from "@/lib/taxonomy";
import { PlatformIcon } from "@/components/platform-icon";
import { Chip } from "@/components/bits";
import { cn } from "@/lib/utils";

const WIN_LABEL: Record<string, string> = { earlier: "Earlier", baseline: "Before", during: "During", after: "After" };

export function ContentTab({ f, sp }: { f: FellowFull; sp: Record<string, string | string[] | undefined> }) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const win = one("win");
  const onlyAis = one("ais") === "1";
  const sort = one("sort") ?? "date";

  // Median views per account → outlier multiplier.
  const med = new Map<string, number>();
  for (const a of f.accounts) {
    const v = f.posts.filter((p) => p.accountId === a.id && p.views != null).map((p) => p.views!).sort((x, y) => x - y);
    if (v.length) med.set(a.id, v[Math.floor(v.length / 2)]!);
  }
  let rows = f.posts.map((p) => ({
    p,
    w: windowOf(p.publishedAt, f.cohort.startDate, f.cohort.endDate),
    outlier: p.views != null && med.get(p.accountId) ? p.views / med.get(p.accountId)! : null,
  }));
  if (win) rows = rows.filter((r) => r.w === win);
  if (onlyAis) rows = rows.filter((r) => r.p.isAiSafety);
  if (sort === "views") rows.sort((a, b) => (b.p.views ?? 0) - (a.p.views ?? 0));
  if (sort === "outlier") rows.sort((a, b) => (b.outlier ?? 0) - (a.outlier ?? 0));

  const q = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams({ tab: "content", ...(win && { win }), ...(onlyAis && { ais: "1" }), ...(sort !== "date" && { sort }) });
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) next.delete(k);
      else next.set(k, v);
    }
    return `/fellows/${f.slug}?${next}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[undefined, "baseline", "during", "after", "earlier"].map((w) => (
          <Link key={w ?? "all"} href={q({ win: w })} className={cn("rounded-md border px-2.5 py-1", win === w ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}>
            {w ? WIN_LABEL[w] : "All windows"}
          </Link>
        ))}
        <Link href={q({ ais: onlyAis ? undefined : "1" })} className={cn("rounded-md border px-2.5 py-1", onlyAis ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}>
          AI safety only
        </Link>
        <span className="ml-auto text-muted-foreground">Sort:</span>
        {["date", "views", "outlier"].map((s) => (
          <Link key={s} href={q({ sort: s === "date" ? undefined : s })} className={cn("rounded-md px-2 py-1", sort === s ? "bg-muted font-medium" : "text-muted-foreground")}>
            {s}
          </Link>
        ))}
        <span className="text-muted-foreground">{rows.length} posts</span>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Post</th>
              <th className="px-3 py-2 text-right font-medium">Views</th>
              <th className="px-3 py-2 text-right font-medium" title="Views ÷ the account's median">Outlier</th>
              <th className="px-3 py-2 text-right font-medium">Eng.</th>
              <th className="px-3 py-2 text-right font-medium" title="Rule/LLM relevance to AI safety">AIS</th>
              <th className="px-3 py-2 font-medium">Topics · CTAs · Orgs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, w, outlier }) => {
              const eng = p.views ? ((p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0)) / p.views : null;
              return (
                <tr key={p.id} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                    {p.publishedAt ? shortDate(p.publishedAt) : "—"}
                    <span className={cn("mt-0.5 block w-fit rounded px-1 text-[10px]", w === "during" ? "bg-s4/20 text-foreground" : "bg-muted")}>{w ? WIN_LABEL[w] : ""}</span>
                  </td>
                  <td className="max-w-md px-3 py-2">
                    <a href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:underline">
                      <PlatformIcon platform={p.platform} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{p.title ?? p.caption ?? "(no caption)"}</span>
                    </a>
                    {p.isSponsored && <Chip className="mt-1">Sponsored</Chip>}
                    {p.analysis && typeof p.analysis === "object" && "summary" in (p.analysis as object) && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String((p.analysis as { summary?: string }).summary)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{compact(p.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {outlier != null ? <span className={cn(outlier >= 3 && "rounded bg-good/15 px-1 font-semibold text-good")}>{outlier.toFixed(1)}x</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(eng)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={cn(p.isAiSafety ? "font-medium" : "text-muted-foreground")}>{p.aiSafetyScore != null ? p.aiSafetyScore.toFixed(2) : "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-sm flex-wrap gap-1">
                      {p.topics.map((t) => (
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
