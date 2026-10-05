import { CheckCircle2, Circle, ExternalLink, Eye, EyeOff, Pin } from "lucide-react";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, Empty, SectionTitle } from "@/components/bits";
import { addNoteAction, deleteNoteAction, toggleNoteAction, updateNoteAction } from "../../team-actions";
import { NoteComposer } from "@/components/note-composer";
import { NoteEditor } from "@/components/note-editor";
import { toggleNoteSharedAction } from "../../program-actions";
import { SlackPanel } from "./slack-panel";

// Team-only: everything we know about a fellow outside their public content,
// in three places (Notion, Granola meetings, team notes) plus a quick-add box.

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
  const notion = notes.filter((n) => n.source === "notion");
  const granola = notes.filter((n) => n.source === "granola" && n.kind === "meeting");
  const team = notes.filter((n) => !notion.includes(n) && !granola.includes(n));
  const open = notes.filter((n) => n.kind === "action" && !n.done);
  // Next steps from the two most recent meetings.
  const followUps = granola
    .slice()
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, 2)
    .flatMap((n) => nextSteps(n.body).map((s) => ({ s, n })));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <section>
          <SectionTitle
            hint="Selection and onboarding notes from the Notion fellows database. Edit them here."
            right={
              <a href="#add" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                + Add note
              </a>
            }
          >
            Notion
          </SectionTitle>
          <div className="space-y-3">
            {notion.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
            {!notion.length && <Empty>Nothing from Notion yet. Paste it below with “Notion” selected.</Empty>}
          </div>
        </section>

        <section>
          <SectionTitle hint="Interviews and 1:1s, newest first. Click to expand.">Granola meetings · {granola.length}</SectionTitle>
          <div className="space-y-2">
            {granola.map((n) => (
              <NoteCard key={n.id} n={n} collapsed />
            ))}
            {!granola.length && <Empty>No meetings yet. Paste a Granola summary below with “Granola meeting” selected.</Empty>}
          </div>
        </section>

        <section>
          <SectionTitle hint="Notes, decisions, action items and feedback. Team only unless marked Shared, which shows it on the fellow's My week page.">Team notes · {team.length}</SectionTitle>
          <div className="space-y-3">
            {team.map((n) => (
              <NoteCard key={n.id} n={n} />
            ))}
            {!team.length && <Empty>No team notes yet.</Empty>}
          </div>
        </section>

        <section className="scroll-mt-20" id="add">
          <SectionTitle>Add to their notes</SectionTitle>
          <NoteComposer action={addNoteAction.bind(null, fellowId)} />
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
            <SectionTitle hint="From 'Next steps' in the last two meetings.">Follow-ups from meetings</SectionTitle>
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
      </aside>
    </div>
  );
}

type Note = Awaited<ReturnType<typeof db.fellowNote.findMany>>[number];

function NoteCard({ n, collapsed }: { n: Note; collapsed?: boolean }) {
  const actions = (
    <div className="ml-auto flex items-center gap-3">
      {n.url && (
        <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          Open <ExternalLink className="size-3" />
        </a>
      )}
      <form action={toggleNoteSharedAction.bind(null, n.id)}>
        <button title={n.shared ? "Visible on the fellow's My week page. Click to make team-only" : "Team-only. Click to share with the fellow"} className={cn("inline-flex items-center gap-1 hover:text-foreground", n.shared && "text-foreground")}>
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
  );
  const editor = (
    <NoteEditor title={n.title} body={n.body} done={n.done} save={updateNoteAction.bind(null, n.id)}>
      {n.body && <Body text={n.body} />}
    </NoteEditor>
  );
  if (collapsed)
    return (
      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
          <span className="text-xs text-muted-foreground tabular-nums">{shortDate(n.date)}</span>
          <span className="font-medium">{n.title}</span>
          {n.shared && <Chip>Shared</Chip>}
        </summary>
        <div className="border-t px-4 py-3">
          <div className="mb-2 flex text-xs text-muted-foreground">{actions}</div>
          {editor}
        </div>
      </details>
    );
  return (
    <article className={cn("rounded-lg border bg-card", n.pinned && "border-foreground/20 bg-muted/30")}>
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <Chip className={n.kind === "decision" ? "bg-s1/15" : n.kind === "action" ? "bg-s4/20" : undefined}>{KIND_LABEL[n.kind] ?? n.kind}</Chip>
        <span>{shortDate(n.date)}</span>
        {n.source !== "manual" && <span className="capitalize">· {n.source}</span>}
        {n.author && <span>· {n.author}</span>}
        {actions}
      </header>
      <div className="px-4 py-3">{editor}</div>
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
