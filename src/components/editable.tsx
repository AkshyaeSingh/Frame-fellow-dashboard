"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Click-to-edit cell for the Fellows database and profile forms. Saves on
// blur / Enter (Cmd+Enter for long text); Escape cancels.

type Props = {
  value: string | number | string[] | null;
  type: "text" | "long" | "tags" | "number" | "select";
  options?: [string, string][];
  placeholder?: string;
  save: (v: string) => Promise<void>;
  className?: string;
  display?: React.ReactNode; // custom read-only rendering
  disabled?: boolean;
};

const asText = (v: Props["value"]) => (v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v));

export function Editable({ value, type, options, placeholder, save, className, display, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asText(value));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);

  const commit = (v = draft) => {
    setEditing(false);
    if (v === asText(value)) return;
    start(async () => {
      try {
        setError(null);
        await save(v);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save");
        setDraft(asText(value));
      }
    });
  };

  if (disabled) return <div className={cn("min-h-6 text-sm", className)}>{display ?? (asText(value) || <span className="text-muted-foreground">–</span>)}</div>;

  if (editing) {
    const base = "w-full rounded border bg-background px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring/40";
    const keys = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraft(asText(value));
        setEditing(false);
      }
      if (e.key === "Enter" && (type !== "long" || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      }
    };
    if (type === "select")
      return (
        <select ref={ref} autoFocus defaultValue={asText(value)} onChange={(e) => commit(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={keys} className={cn(base, className)}>
          <option value="">–</option>
          {options?.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      );
    if (type === "long")
      return <textarea ref={ref} autoFocus value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit()} onKeyDown={keys} rows={4} className={cn(base, "min-w-56", className)} />;
    return (
      <input
        ref={ref}
        autoFocus
        type={type === "number" ? "number" : "text"}
        step="any"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={keys}
        className={cn(base, type === "number" ? "w-20" : "min-w-40", className)}
      />
    );
  }

  const text = asText(value);
  const shown =
    display ??
    (type === "tags" && Array.isArray(value) && value.length ? (
      <span className="flex flex-wrap gap-1">
        {value.map((t) => (
          <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
            {t}
          </span>
        ))}
      </span>
    ) : type === "select" ? (
      options?.find(([k]) => k === text)?.[1]
    ) : (
      text
    ));
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(text);
        setEditing(true);
      }}
      title="Click to edit"
      className={cn("group block w-full rounded px-1 py-0.5 text-left text-sm hover:bg-muted/70", pending && "opacity-50", type === "long" && "whitespace-pre-wrap", className)}
    >
      {text || display ? shown : <span className="text-muted-foreground/70">{placeholder ?? "–"}</span>}
      <Pencil className="ml-1 inline size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      {error && <span className="block text-xs text-bad">{error}</span>}
    </button>
  );
}
