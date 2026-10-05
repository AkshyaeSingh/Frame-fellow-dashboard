"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Shows a note's title + rendered body; "Edit" swaps to plain-text editing.
export function NoteEditor({
  title,
  body,
  done,
  save,
  children,
}: {
  title: string;
  body: string | null;
  done?: boolean;
  save: (title: string, body: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [b, setB] = useState(body ?? "");
  const [pending, start] = useTransition();
  if (editing)
    return (
      <div className="space-y-2">
        <input value={t} onChange={(e) => setT(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm font-medium" />
        <textarea value={b} onChange={(e) => setB(e.target.value)} rows={Math.min(20, Math.max(4, b.split("\n").length + 1))} className="w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="h-7 rounded-md border px-3 text-xs">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await save(t, b);
                setEditing(false);
              })
            }
            className="h-7 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  return (
    <div className="group">
      <div className="flex items-start gap-2">
        <h3 className={cn("flex-1 text-sm font-medium", done && "text-muted-foreground line-through")}>{title}</h3>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-foreground">
          <Pencil className="size-3" /> Edit
        </button>
      </div>
      {children}
    </div>
  );
}
