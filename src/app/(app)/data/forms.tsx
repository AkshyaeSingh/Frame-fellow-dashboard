"use client";

import { useActionState } from "react";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { importDatasetAction, startScrapeAction, type Result } from "./actions";

const inp = "h-8 rounded-md border bg-background px-2 text-sm";

function Msg({ r }: { r: Result }) {
  if (!r) return null;
  return <p className={`mt-2 text-xs ${r.error ? "text-bad" : "text-good"}`}>{r.error ?? r.ok}</p>;
}

export function ImportForm() {
  const [r, action, pending] = useActionState(importDatasetAction, undefined);
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <select name="platform" className={inp} defaultValue="YOUTUBE">
          {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="datasetId" required placeholder="Dataset ID" className={`${inp} w-48 font-mono`} />
        <button disabled={pending} className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      <Msg r={r} />
    </form>
  );
}

export function ScrapeForm({ disabled }: { disabled: boolean }) {
  const [r, action, pending] = useActionState(startScrapeAction, undefined);
  return (
    <form action={action}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Posts since
          <input name="since" type="date" className={`${inp} block`} />
        </label>
        <label className="text-xs text-muted-foreground">
          Max per account
          <input name="perAccount" type="number" defaultValue={30} className={`${inp} block w-24`} />
        </label>
        <label className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
          <input name="comments" type="checkbox" defaultChecked /> + comments on recent posts
        </label>
        <button disabled={disabled || pending} className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">
          {pending ? "Starting…" : "Start scrape"}
        </button>
      </div>
      <Msg r={r} />
    </form>
  );
}
