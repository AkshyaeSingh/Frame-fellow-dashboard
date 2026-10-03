import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { compact, relativeDate, shortDate } from "@/lib/format";
import { CreatorAvatar } from "@/components/creator-avatar";
import { PlatformIcon } from "@/components/platform-icon";
import { SectionTitle } from "@/components/bits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cohort" };

// The Frame Content Board: what everyone in the cohort has published during the
// fellowship. Visible to fellows (their own cohort) and the team. Deliberately
// shows output only, not targets, status or team notes.
export default async function CohortPage(props: PageProps<"/cohort">) {
  const s = await getSession();
  if (!s) redirect("/login");
  const sp = await props.searchParams;
  const cohorts = await db.cohort.findMany({ orderBy: { startDate: "desc" } });
  // The team sees the same board on the Content page.
  if (s.role !== "fellow") redirect(`/content?cohort=${typeof sp.cohort === "string" ? sp.cohort : cohorts[0]!.slug}`);
  let cohort = cohorts.find((c) => c.slug === sp.cohort) ?? cohorts[0]!;
  let meId: string | undefined;
  if (s.role === "fellow") {
    const me = await db.fellow.findUniqueOrThrow({ where: { id: s.fellowId }, select: { id: true, cohortId: true } });
    cohort = cohorts.find((c) => c.id === me.cohortId)!;
    meId = me.id;
  }
  const since = cohort.startDate;
  const raw = await db.fellow.findMany({
    where: { cohortId: cohort.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      track: true,
      partnerOrg: true,
      cadenceScope: true,
      accounts: { select: { avatarUrl: true } },
      posts: {
        where: { publishedAt: { gte: since } },
        orderBy: { publishedAt: "desc" },
        select: { id: true, url: true, title: true, caption: true, platform: true, publishedAt: true, views: true, thumbnailUrl: true, isAiSafety: true },
      },
    },
  });
  // Fellows tracked on a company channel (e.g. EO) only count their AI-safety posts.
  const fellows = raw.map((f) => ({ ...f, posts: f.cadenceScope === "ai-safety" ? f.posts.filter((p) => p.isAiSafety) : f.posts }));
  const feed = fellows
    .flatMap((f) => f.posts.map((p) => ({ ...p, fellow: f })))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, 48);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Frame content board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything {cohort.name.split(" (")[0]} has published since the fellowship started ({shortDate(cohort.startDate)}). Updated weekly.
          </p>
        </div>
        {s.role !== "fellow" && (
          <div className="flex rounded-md border p-0.5 text-xs">
            {cohorts.map((c) => (
              <Link key={c.id} href={`/cohort?cohort=${c.slug}`} className={cn("rounded px-2 py-1", c.id === cohort.id ? "bg-muted font-medium" : "text-muted-foreground")}>
                {c.name.split(" (")[0]}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fellows.map((f) => {
          const views = f.posts.reduce((a, p) => a + (p.views ?? 0), 0);
          return (
            <Link key={f.id} href={f.id === meId ? "/me" : `/fellows/${f.slug}`} className={cn("rounded-lg border bg-card p-3 hover:border-foreground/30", f.id === meId && "ring-2 ring-foreground/20")}>
              <div className="flex items-center gap-2">
                <CreatorAvatar name={f.name} src={f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-8 text-xs" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {f.name}
                    {f.id === meId && <span className="text-xs text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{[f.track, f.partnerOrg].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                <p>
                  <span className="text-base font-semibold tabular-nums">{f.posts.length}</span> <span className="text-muted-foreground">posts</span>
                </p>
                <p>
                  <span className="text-base font-semibold tabular-nums">{compact(views)}</span> <span className="text-muted-foreground">views</span>
                </p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Latest: {relativeDate(f.posts[0]?.publishedAt)}</p>
            </Link>
          );
        })}
      </section>

      <section>
        <SectionTitle>Latest posts</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {feed.map((p) => (
            <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-lg border bg-card">
              <div className="aspect-[4/5] bg-muted">
                {p.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote platform thumbnails
                  <img src={p.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs group-hover:underline">{p.title ?? p.caption ?? "Untitled"}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <PlatformIcon platform={p.platform} className="size-3" />
                  {p.fellow.name.split(" ")[0]} · {compact(p.views)} · {shortDate(p.publishedAt).replace(/, \d{4}$/, "")}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
