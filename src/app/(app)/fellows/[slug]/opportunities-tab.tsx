import { db } from "@/lib/db";
import { fellowResources, recommendationsFor } from "@/lib/recommend";
import { ResourceCard } from "@/components/resource-card";
import { Empty, SectionTitle } from "@/components/bits";
import { cn } from "@/lib/utils";
import { addResourceAction, setResourceStatusAction } from "../../program-actions";

const STATUSES = [
  { key: "interested", label: "Interested" },
  { key: "attended", label: "Went" },
  { key: "liked", label: "Loved it" },
  { key: "not-relevant", label: "Not for me" },
];

export async function OpportunitiesTab({ fellowId, isTeam, canEdit }: { fellowId: string; isTeam: boolean; canEdit: boolean }) {
  const [recs, mine, all] = await Promise.all([recommendationsFor(fellowId), fellowResources(fellowId), isTeam ? db.resource.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }) : []]);
  const history = mine.filter((m) => m.status !== "recommended" && m.status !== "not-relevant");

  const buttons = (resourceId: string, current: string | null) =>
    canEdit && (
      <div className="mt-1 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <form key={s.key} action={setResourceStatusAction.bind(null, fellowId, resourceId, current === s.key ? "clear" : s.key)}>
            <button className={cn("rounded border px-2 py-0.5 text-xs", current === s.key ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{s.label}</button>
          </form>
        ))}
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <section>
          <SectionTitle hint="Matched to interests, what you post about, your partner org and format, plus what fellows with similar interests liked. Mark what you go to so recommendations improve.">
            Recommended
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {recs.map((x) => (
              <ResourceCard key={x.resource.id} r={x.resource} reasons={x.reasons}>
                {buttons(x.resource.id, x.status)}
              </ResourceCard>
            ))}
          </div>
          {!recs.length && <Empty>No matches yet. Add interests to their profile to get recommendations.</Empty>}
        </section>
        <section>
          <SectionTitle>Events & resources {isTeam ? "they've" : "you've"} marked</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((m) => (
              <ResourceCard key={m.id} r={m.resource}>
                {buttons(m.resourceId, m.status)}
              </ResourceCard>
            ))}
          </div>
          {!history.length && <Empty>Nothing marked yet.</Empty>}
        </section>
      </div>
      <aside className="space-y-6">
        {isTeam && all.length > 0 && (
          <section className="rounded-lg border border-dashed p-3">
            <p className="mb-2 text-sm font-medium">Recommend something</p>
            <form
              action={async (fd: FormData) => {
                "use server";
                const id = String(fd.get("resourceId") ?? "");
                if (id) await setResourceStatusAction(fellowId, id, "recommended");
              }}
              className="flex gap-2"
            >
              <select name="resourceId" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">
                {all.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <button className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground">Add</button>
            </form>
            <p className="mt-1 text-[11px] text-muted-foreground">Team picks rank first. Manage the full list on Resources.</p>
          </section>
        )}
        {canEdit && (
          <section className="rounded-lg border border-dashed p-3">
            <p className="mb-2 text-sm font-medium">Log an event</p>
            <form action={addResourceAction} className="space-y-2">
              <input type="hidden" name="fellowId" value={fellowId} />
              <input name="title" required placeholder="Event or resource" className="h-8 w-full rounded-md border bg-background px-2 text-sm" />
              <input name="url" placeholder="Link (Luma, Partiful…)" className="h-8 w-full rounded-md border bg-background px-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input name="date" type="date" className="h-8 rounded-md border bg-background px-2 text-sm" />
                <select name="status" defaultValue="attended" className="h-8 rounded-md border bg-background px-2 text-sm">
                  <option value="attended">Went</option>
                  <option value="liked">Loved it</option>
                  <option value="interested">Want to go</option>
                </select>
              </div>
              <input name="tags" placeholder="Tags: policy, networking, editing…" className="h-8 w-full rounded-md border bg-background px-2 text-sm" />
              <input type="hidden" name="kind" value="event" />
              <button className="h-8 w-full rounded-md bg-primary px-3 text-sm text-primary-foreground">Save</button>
            </form>
          </section>
        )}
      </aside>
    </div>
  );
}
