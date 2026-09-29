import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/format";
import { ResourceCard } from "@/components/resource-card";
import { SectionTitle } from "@/components/bits";
import { addResourceAction, deleteResourceAction } from "../program-actions";

export const metadata: Metadata = { title: "Resources" };

// Team-curated events, people, funding and resources. Recommendations on each
// fellow's Opportunities tab are matched from this list by tags.
export default async function ResourcesPage() {
  if ((await getRole()) !== "team") redirect("/");
  const resources = await db.resource.findMany({
    orderBy: [{ date: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    include: { fellows: { include: { fellow: { select: { name: true, slug: true } } } } },
  });
  const now = daysAgo(1).getTime();
  const upcoming = resources.filter((r) => !r.date || (r.endDate ?? r.date).getTime() >= now);
  const past = resources.filter((r) => r.date && (r.endDate ?? r.date).getTime() < now);
  const inp = "h-8 w-full rounded-md border bg-background px-2 text-sm";

  const card = (r: (typeof resources)[number]) => (
    <ResourceCard key={r.id} r={r}>
      <div className="flex flex-wrap gap-1">
        {r.tags.map((t) => (
          <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
            {t}
          </span>
        ))}
      </div>
      {r.fellows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {r.fellows.map((x, i) => (
            <span key={x.id}>
              {i > 0 && ", "}
              <Link href={`/fellows/${x.fellow.slug}?tab=opportunities`} className="text-foreground hover:underline">
                {x.fellow.name.split(" ")[0]}
              </Link>{" "}
              ({x.status})
            </span>
          ))}
        </p>
      )}
      <p className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Source: {r.source}</span>
        <form action={deleteResourceAction.bind(null, r.id)}>
          <button className="hover:text-bad">Delete</button>
        </form>
      </p>
    </ResourceCard>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Resources & events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What we point fellows to. Tags drive the matching on each fellow&apos;s Opportunities tab, so use the same words as their interests (e.g. editing, funding, policy, documentary). Event links posted in Slack are added here automatically.
          </p>
        </div>
        <section>
          <SectionTitle>Upcoming & ongoing · {upcoming.length}</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">{upcoming.map(card)}</div>
        </section>
        {past.length > 0 && (
          <section>
            <SectionTitle>Past · {past.length}</SectionTitle>
            <div className="grid gap-3 opacity-80 md:grid-cols-2">{past.map(card)}</div>
          </section>
        )}
      </div>
      <aside>
        <section className="sticky top-16 rounded-lg border border-dashed p-3">
          <p className="mb-2 text-sm font-medium">Add</p>
          <form action={addResourceAction} className="space-y-2">
            <select name="kind" className={inp} defaultValue="event">
              <option value="event">Event</option>
              <option value="resource">Resource</option>
              <option value="funding">Funding</option>
              <option value="person">Person / mentor</option>
              <option value="opportunity">Opportunity</option>
            </select>
            <input name="title" required placeholder="Title" className={inp} />
            <input name="url" placeholder="Link" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input name="date" type="date" className={inp} />
              <input name="location" placeholder="Location" className={inp} />
            </div>
            <textarea name="description" placeholder="Why it's useful" className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-sm" />
            <input name="tags" placeholder="Tags, comma-separated" className={inp} />
            <button className="h-8 w-full rounded-md bg-primary px-3 text-sm text-primary-foreground">Add</button>
          </form>
        </section>
      </aside>
    </div>
  );
}
