import type { Platform } from "@prisma/client";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { PlatformIcon } from "@/components/platform-icon";
import { SectionTitle } from "@/components/bits";
import { addOwnAccountAction, removeOwnAccountAction } from "@/app/(app)/program-actions";

// Tracked handles for one fellow. Fellows can add handles and remove ones with
// no scraped posts yet; the team can remove any.
export function AccountsEditor({
  fellowId,
  accounts,
  postAccountIds,
  isTeam,
  isSelf,
}: {
  fellowId: string;
  accounts: { id: string; platform: Platform; handle: string; note: string | null }[];
  postAccountIds: string[];
  isTeam: boolean;
  isSelf: boolean;
}) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <SectionTitle hint="Where content gets tracked. New handles are picked up by the next weekly scrape.">{isSelf ? "Your accounts" : "Accounts"}</SectionTitle>
      <ul className="space-y-1 text-sm">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <PlatformIcon platform={a.platform} className="size-3.5" />
            <span>{a.handle}</span>
            {a.note && <span className="truncate text-xs text-muted-foreground">{a.note}</span>}
            {(isTeam || !postAccountIds.includes(a.id)) && (
              <form action={removeOwnAccountAction.bind(null, fellowId, a.id)} className="ml-auto">
                <button className="text-xs text-muted-foreground hover:text-bad">Remove</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={addOwnAccountAction.bind(null, fellowId)} className="mt-2 flex gap-1">
        <select name="platform" className="h-8 rounded-md border bg-background px-1 text-xs">
          {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="handle" required placeholder="@handle or link" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" />
        <button className="h-8 rounded-md border px-2 text-xs">Add</button>
      </form>
    </section>
  );
}
