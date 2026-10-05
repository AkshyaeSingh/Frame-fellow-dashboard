"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Quick-add box at the bottom of a fellow's Notes tab. Pick where it goes,
// type or paste, Cmd/Ctrl+Enter to save.
const TYPES = [
  { key: "note", label: "Note", kind: "note", source: "manual", hint: "Anything worth remembering about them" },
  { key: "decision", label: "Decision", kind: "decision", source: "manual", hint: "What we agreed with them" },
  { key: "action", label: "Action item", kind: "action", source: "manual", hint: "Something someone needs to do" },
  { key: "feedback", label: "Feedback", kind: "feedback", source: "manual", hint: "Feedback they gave or we gave" },
  { key: "granola", label: "Granola meeting", kind: "meeting", source: "granola", hint: "Paste the Granola summary and link" },
  { key: "notion", label: "Notion", kind: "note", source: "notion", hint: "Paste from the Notion fellow page" },
] as const;

type Action = (prev: { ok: number } | undefined, fd: FormData) => Promise<{ ok: number }>;

export function NoteComposer({ action, initial = "note" }: { action: Action; initial?: (typeof TYPES)[number]["key"] }) {
  const [state, submit, pending] = useActionState(action, { ok: 0 });
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>(initial);
  const [more, setMore] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const t = TYPES.find((x) => x.key === type)!;
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);
  const inp = "h-8 rounded-md border bg-background px-2 text-sm";
  return (
    <form ref={form} action={submit} id="add-note" className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap gap-1">
        {TYPES.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setType(x.key)}
            className={cn("rounded-full border px-2.5 py-0.5 text-xs", type === x.key ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={t.kind} />
      <input type="hidden" name="source" value={t.source} />
      <textarea
        name="body"
        rows={type === "granola" || type === "notion" ? 6 : 3}
        placeholder={`${t.hint}. First line becomes the title.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            form.current?.requestSubmit();
          }
        }}
        className="w-full rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(more || type === "granola" || type === "notion") && (
          <>
            <input name="url" placeholder={type === "notion" ? "Notion link" : type === "granola" ? "Granola link" : "Link"} className={cn(inp, "min-w-48 flex-1")} />
            <input name="date" type="date" className={inp} />
            <input name="title" placeholder="Title (optional)" className={cn(inp, "min-w-40 flex-1")} />
          </>
        )}
        {!more && type !== "granola" && type !== "notion" && (
          <button type="button" onClick={() => setMore(true)} className="text-xs text-muted-foreground hover:text-foreground">
            + link, date, title
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">⌘↵ to save</span>
        <button disabled={pending} className="h-8 rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}
