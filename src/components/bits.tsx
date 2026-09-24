import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, sub, hint }: { label: string; value: React.ReactNode; sub?: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4" title={hint}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Relative change with an icon + sign so it never relies on color alone.
export function Delta({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className={cn("text-muted-foreground", className)}>—</span>;
  if (!Number.isFinite(value))
    return (
      <span className={cn("inline-flex items-center gap-0.5 font-medium text-good", className)}>
        <ArrowUpRight className="size-3" />
        new
      </span>
    );
  const pct = Math.round(value * 100);
  if (Math.abs(pct) < 5)
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-muted-foreground", className)}>
        <Minus className="size-3" />
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
    );
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-good" : "text-bad", className)}>
      <Icon className="size-3" />
      {up ? "+" : ""}
      {pct > 999 ? ">999" : pct}%
    </span>
  );
}

// Percentage-point change (for shares).
export function PointDelta({ from, to }: { from: number | null; to: number | null }) {
  if (from == null || to == null) return <span className="text-muted-foreground">—</span>;
  const pp = Math.round((to - from) * 100);
  const up = pp > 0;
  if (Math.abs(pp) < 3) return <span className="text-muted-foreground">±{Math.abs(pp)}pp</span>;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-good" : "text-bad")}>
      <Icon className="size-3" />
      {up ? "+" : ""}
      {pp}pp
    </span>
  );
}

export function SectionTitle({ children, hint, right }: { children: React.ReactNode; hint?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold">{children}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Chip({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
