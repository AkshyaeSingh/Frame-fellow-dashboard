import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { PlatformIcon } from "@/components/platform-icon";
import { SectionTitle } from "@/components/bits";
import { addAccountAction, removeAccountAction } from "../team-actions";
import { syncRunsAction } from "./actions";
import { ImportForm, ScrapeForm } from "./forms";

export const metadata: Metadata = { title: "Data & scraping" };

export default async function DataPage() {
  if ((await getRole()) !== "team") redirect("/");
  const [fellows, runs] = await Promise.all([
    db.fellow.findMany({
      include: { cohort: true, accounts: { include: { _count: { select: { posts: true } } }, orderBy: { platform: "asc" } } },
      orderBy: [{ cohort: { startDate: "asc" } }, { name: "asc" }],
    }),
    db.scrapeRun.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const hasToken = !!process.env.APIFY_TOKEN;
  const inp = "h-7 rounded-md border bg-background px-2 text-xs";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Data & scraping</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Handles to track, Apify runs, and imports. Scrapes run on Apify (billed to Frame&apos;s account, roughly $0.003–0.004 per post). Point an Apify
          schedule&apos;s webhook at <code>/api/apify-webhook?token=WEBHOOK_SECRET</code> to import automatically, as Frame-Agent did.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <SectionTitle hint={hasToken ? "Starts one run per platform for every tracked handle." : "Set APIFY_TOKEN in .env to enable."}>Run a scrape</SectionTitle>
          <ScrapeForm disabled={!hasToken} />
          {hasToken && (
            <form action={syncRunsAction} className="mt-2">
              <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Check & import finished runs</button>
            </form>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <SectionTitle hint="Paste the dataset ID from any finished Apify run (Storage → Datasets).">Import a finished dataset</SectionTitle>
          <ImportForm />
        </section>
      </div>

      <section>
        <SectionTitle>Recent runs</SectionTitle>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Items</th>
                <th className="px-3 py-2 text-right font-medium">Posts</th>
                <th className="px-3 py-2 font-medium">Dataset</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{relativeDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{PLATFORM_LABEL[r.platform]}</td>
                  <td className="px-3 py-2 text-xs">{r.actor}</td>
                  <td className="px-3 py-2 text-xs">{r.status}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.items}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.postsUpserted}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.datasetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle hint="A scraped account is only imported if it's listed here, so nobody is tracked by accident.">Tracked handles</SectionTitle>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <tbody>
              {fellows.map((f) => (
                <tr key={f.id} className="border-b align-top last:border-0">
                  <td className="w-56 px-3 py-2">
                    <Link href={`/fellows/${f.slug}`} className="font-medium hover:underline">
                      {f.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{f.cohort.name.split(" (")[0]}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {f.accounts.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs" title={a.note ?? ""}>
                          <PlatformIcon platform={a.platform} className="size-3" />
                          {a.handle}
                          <span className="text-muted-foreground">· {a._count.posts} posts · {a.lastScrapedAt ? relativeDate(a.lastScrapedAt) : "never scraped"}</span>
                          <form action={removeAccountAction.bind(null, a.id)}>
                            <button className="ml-1 text-muted-foreground hover:text-bad" aria-label={`Remove ${a.handle}`}>
                              ×
                            </button>
                          </form>
                        </span>
                      ))}
                    </div>
                    <form action={addAccountAction.bind(null, f.id)} className="mt-1.5 flex flex-wrap gap-1.5">
                      <select name="platform" className={inp} defaultValue="INSTAGRAM">
                        {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input name="handle" required placeholder="handle" className={`${inp} w-36`} />
                      <input name="url" placeholder="profile URL (optional)" className={`${inp} w-56`} />
                      <button className="h-7 rounded-md border px-2 text-xs hover:bg-muted">Add</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
