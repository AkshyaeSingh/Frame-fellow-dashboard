import { CheckCircle2, Circle, ExternalLink, Eye, EyeOff, Pin } from "lucide-react";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, Empty, SectionTitle } from "@/components/bits";
import { addNoteAction, deleteNoteAction, toggleNoteAction } from "../../team-actions";
import { toggleNoteSharedAction } from "../../program-actions";
import { SlackPanel } from "./slack-panel";

// Team-only: everything we know about a fellow outside their public content —
// interview and check-in notes (Granola), decisions, action items, feedback.

const KINDS = [
  { key: "meeting", label: "Meeting" },
  { key: "decision", label: "Decision" },
  { key: "action", label: "Action item" },
  { key: "feedback", label: "Feedback" },
  { key: "note", label: "Note" },
] as const;
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.key, k.label])) as Record<string, string>;

// Pull "Next Steps" lines out of Granola notes so open follow-ups are visible without opening each meeting.
function nextSteps(body: string | null) {
  if (!body) return [];
  const lines = body.split("\n");
  const i = lines.findIndex((l) => /^#*\s*next steps\s*$/i.test(l.trim()));
  if (i < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(i + 1)) {
    if (/^#{1,3} /.test(l)) break;
    const t = l.trim();
    if (t.startsWith("- ")) out.push(t.slice(2).replace(/\*\*/g, ""));
    else if (!body.includes("\n# ") && t && /\(|^(send|follow|confirm|review|finalize|share|complete|schedule|book|reach|connect|ask|get|start|draft|decide)/i.test(t)) out.push(t);
  }
  return out.slice(0, 6);
}

export async function ContextTab({ fellowId }: { fellowId: string }) {
  const notes = await db.fellowNote.findMany({ where: { fellowId }, orderBy: [{ pinned: "desc" }, { date: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] });
  const pinned = notes.filter((n) => n.pinned);
  const open = notes.filter((n) => n.kind === "action" && !n.done);
  const timeline = notes.filter((n) => !n.pinned);
  // Next steps from the two most recent meetings.
  const followUps = notes
    .filter((n) => n.kind === "meeting")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, 2)
    .flatMap((n) => nextSteps(n.body).map((s) => ({ s, n })));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {pinned.map((n) => (
          <NoteCard key={n.id} n={n} />
        ))}
        <section>
          <SectionTitle hint="Meetings, decisions, action items and feedback, newest first. Team only unless you mark a note Shared, which puts it on the fellow's Plan tab.">Timeline</SectionTitle>
          <div className="space-y-3">
            {timeline.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
            {!notes.length && <Empty>No context yet. Add a meeting note or paste a Granola link.</Empty>}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section>
          <SectionTitle>Open action items</SectionTitle>
          <ul className="space-y-1.5 text-sm">
            {open.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <form action={toggleNoteAction.bind(null, n.id, "done")}>
                  <button title="Mark done" className="mt-0.5 text-muted-foreground hover:text-foreground">
                    <Circle className="size-4" />
                  </button>
                </form>
                <span>{n.title}</span>
              </li>
            ))}
            {!open.length && <li className="text-xs text-muted-foreground">None open.</li>}
          </ul>
        </section>
        {followUps.length > 0 && (
          <section>
            <SectionTitle hint="From 'Next steps' in meeting notes. Turn one into an action item to track it.">Follow-ups mentioned in meetings</SectionTitle>
            <ul className="space-y-1.5 text-xs">
              {followUps.map(({ s, n }, i) => (
                <li key={i} className="rounded-md bg-muted/60 px-2 py-1.5">
                  {s}
                  <span className="block text-muted-foreground">{shortDate(n.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <SlackPanel fellowId={fellowId} />
        <NoteForm fellowId={fellowId} />
      </aside>
    </div>
  );
}

type Note = Awaited<ReturnType<typeof db.fellowNote.findMany>>[number];

// One-line plain-text preview of a note body (markdown markers stripped).
const preview = (body: string) =>
  body
    .split("\n")
    .map((l) => l.replace(/^#+ |^\s*- |^\d+\. |\*\*/g, "").trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 260)
    .trimEnd();

function NoteCard({ n }: { n: Note }) {
  const long = (n.body?.length ?? 0) > 600;
  return (
    <article className={cn("rounded-lg border bg-card", n.pinned && "border-foreground/20 bg-muted/30")}>
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <Chip className={n.kind === "decision" ? "bg-s1/15" : n.kind === "action" ? "bg-s4/20" : undefined}>{KIND_LABEL[n.kind] ?? n.kind}</Chip>
        <span>{shortDate(n.date)}</span>
        {n.source !== "manual" && <span className="capitalize">· {n.source}</span>}
        {n.author && <span>· {n.author}</span>}
        <div className="ml-auto flex items-center gap-3">
          {n.url && (
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              Open <ExternalLink className="size-3" />
            </a>
          )}
          <form action={toggleNoteSharedAction.bind(null, n.id)}>
            <button title={n.shared ? "Visible on the fellow's dashboard. Click to make team-only" : "Team-only. Click to share with the fellow"} className={cn("inline-flex items-center gap-1 hover:text-foreground", n.shared && "text-foreground")}>
              {n.shared ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {n.shared ? "Shared" : "Team only"}
            </button>
          </form>
          <form action={toggleNoteAction.bind(null, n.id, "pinned")}>
            <button title={n.pinned ? "Unpin" : "Pin to top"} className={cn("hover:text-foreground", n.pinned && "text-foreground")}>
              <Pin className="size-3.5" />
            </button>
          </form>
          {n.kind === "action" && (
            <form action={toggleNoteAction.bind(null, n.id, "done")}>
              <button className="inline-flex items-center gap-1 hover:text-foreground">
                {n.done ? <CheckCircle2 className="size-3.5 text-good" /> : <Circle className="size-3.5" />} {n.done ? "Done" : "Open"}
              </button>
            </form>
          )}
          <form action={deleteNoteAction.bind(null, n.id)}>
            <button className="hover:text-bad">Delete</button>
          </form>
        </div>
      </header>
      <div className="px-4 py-3">
        <h3 className={cn("text-sm font-medium", n.done && "text-muted-foreground line-through")}>{n.title}</h3>
        {n.body &&
          (long ? (
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                <span>{preview(n.body)}…</span> <span className="text-xs underline">Show all</span>
              </summary>
              <Body text={n.body} />
            </details>
          ) : (
            <Body text={n.body} />
          ))}
      </div>
    </article>
  );
}

// Renders Granola summaries: markdown headings/bullets (Sep 2026 on) or the
// older line-per-point share-page text.
function Body({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const md = lines.some((l) => /^(#{1,3} |\s*- |\d+\. )/.test(l));
  const bold = (l: string) =>
    l.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.replace(/\\([~&])/g, "$1")));
  return (
    <div className="mt-1 space-y-0.5 text-sm">
      {lines.map((l, i) => {
        const heading = md ? /^#{1,3} /.test(l) : l.length < 70 && !/[.,:;)?]$/.test(l) && i + 1 < lines.length && /^[A-Z]/.test(l) && l.split(" ").length <= 7;
        if (heading)
          return (
            <p key={i} className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pt-0">
              {l.replace(/^#+ /, "")}
            </p>
          );
        const sub = /^\s{2,}- /.test(l);
        const numbered = l.match(/^(\d+)\. (.*)/);
        const content = l.replace(/^\s*- /, "").replace(/^\d+\. /, "");
        if (md && !/^\s*- |^\d+\. /.test(l)) return <p key={i} className="pl-3 text-muted-foreground">{bold(content)}</p>;
        return (
          <p key={i} className={cn("pl-3 before:mr-1.5 before:-ml-3 before:text-muted-foreground", sub ? "ml-4 before:content-['◦']" : numbered ? "" : "before:content-['•']")}>
            {numbered && <span className="mr-1 -ml-3 text-muted-foreground">{numbered[1]}.</span>}
            {bold(content)}
          </p>
        );
      })}
    </div>
  );
}

function NoteForm({ fellowId }: { fellowId: string }) {
  const inp = "h-8 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <section className="rounded-lg border border-dashed p-3">
      <p className="mb-2 text-sm font-medium">Add context</p>
      <form action={addNoteAction.bind(null, fellowId)} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select name="kind" defaultValue="meeting" className={inp}>
            {KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <input name="date" type="date" className={inp} />
        </div>
        <input name="title" required placeholder="Title (e.g. Week 4 check-in)" className={inp} />
        <input name="url" placeholder="Link (Granola, Notion, doc…)" className={inp} />
        <textarea name="body" placeholder="Notes: paste the Granola summary, what was decided, next steps…" className="min-h-28 w-full rounded-md border bg-background px-2 py-1 text-sm" />
        <input name="author" placeholder="Your name" className={inp} />
        <button className="h-8 w-full rounded-md bg-primary px-3 text-sm text-primary-foreground">Save</button>
      </form>
    </section>
  );
}
