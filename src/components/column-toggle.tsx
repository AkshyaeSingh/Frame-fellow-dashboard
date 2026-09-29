"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Shows/hides table columns (cells carry data-col="key") with a per-viewer
// preset remembered in localStorage. "Simple" shows only the essentials.

type Col = { key: string; label: string; simple?: boolean };

export function ColumnToggle({ id, columns }: { id: string; columns: Col[] }) {
  const simple = columns.filter((c) => c.simple).map((c) => c.key);
  const [shown, setShown] = useState<string[]>(simple);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cols:${id}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore per-viewer preference after hydration
      if (saved) setShown(JSON.parse(saved));
    } catch {}
  }, [id]);
  const set = (next: string[]) => {
    setShown(next);
    try {
      localStorage.setItem(`cols:${id}`, JSON.stringify(next));
    } catch {}
  };
  const hidden = columns.filter((c) => !shown.includes(c.key)).map((c) => c.key);
  const isSimple = shown.length === simple.length && simple.every((k) => shown.includes(k));
  const isAll = hidden.length === 0;
  return (
    <div className="relative flex items-center gap-1 text-xs">
      <style>{hidden.map((k) => `[data-table="${id}"] [data-col="${k}"]{display:none}`).join("")}</style>
      <div className="flex rounded-md border p-0.5">
        <button onClick={() => set(simple)} className={cn("rounded px-2 py-1", isSimple ? "bg-muted font-medium" : "text-muted-foreground")}>
          Simple
        </button>
        <button onClick={() => set(columns.map((c) => c.key))} className={cn("rounded px-2 py-1", isAll ? "bg-muted font-medium" : "text-muted-foreground")}>
          All columns
        </button>
        <button onClick={() => setOpen((o) => !o)} className={cn("rounded px-2 py-1", !isSimple && !isAll ? "bg-muted font-medium" : "text-muted-foreground")}>
          Custom…
        </button>
      </div>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 grid w-64 gap-1 rounded-lg border bg-popover p-2 shadow-md">
          {columns.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
              <input type="checkbox" checked={shown.includes(c.key)} onChange={(e) => set(e.target.checked ? [...shown, c.key] : shown.filter((k) => k !== c.key))} />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
