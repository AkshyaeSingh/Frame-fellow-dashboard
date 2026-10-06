"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { STATUSES, statusOf } from "@/lib/checklist";
import { cn } from "@/lib/utils";

// Monday-style status cell: a coloured pill that opens a status menu.
export function StatusPill({ status, onChange, readOnly, title, className }: { status: string; onChange?: (s: string) => Promise<void>; readOnly?: boolean; title?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState(status);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOptimistic(status), [status]); // eslint-disable-line react-hooks/set-state-in-effect -- sync after server refresh
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const s = statusOf(optimistic);
  const pill = (
    <span
      className={cn("flex h-7 w-full min-w-24 items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap", s.text, pending && "opacity-60", className)}
      style={{ background: s.color }}
      title={title}
    >
      {s.label}
    </span>
  );
  if (readOnly || !onChange) return pill;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="block w-full">
        {pill}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 grid w-40 gap-1 rounded-lg border bg-popover p-1.5 shadow-lg">
          {STATUSES.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => {
                setOpen(false);
                setOptimistic(x.key);
                start(() => onChange(x.key));
              }}
              className={cn("h-7 rounded-md px-2 text-xs font-medium", x.text)}
              style={{ background: x.color }}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
