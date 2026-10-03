"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// GET form that re-submits on change, keeping filters in the URL.
export function FilterForm({
  values,
  selects,
  count,
  keep,
}: {
  values: Record<string, string | undefined>;
  selects: { name: string; label: string; options: [string, string][]; noEmpty?: boolean }[];
  count?: string;
  keep?: Record<string, string | undefined>; // extra params carried through as hidden inputs
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} method="get" className="flex flex-wrap items-center gap-2">
      <label className="relative w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={values.q} placeholder="Search text & transcripts" className="h-8 w-full rounded-md border bg-background pr-2 pl-8 text-sm" />
      </label>
      {selects.map((s) => (
        <select
          key={s.name}
          name={s.name}
          aria-label={s.label}
          defaultValue={values[s.name] ?? ""}
          onChange={() => ref.current?.requestSubmit()}
          className={cn("h-8 w-36 rounded-md border bg-background px-2 text-xs", values[s.name] && !s.noEmpty ? "border-foreground/40 font-medium" : "text-muted-foreground")}
        >
          {!s.noEmpty && <option value="">{s.label}</option>}
          {s.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ))}
      {Object.entries(keep ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <button className="sr-only">Apply</button>
      {count && <span className="ml-auto text-xs text-muted-foreground">{count}</span>}
    </form>
  );
}
