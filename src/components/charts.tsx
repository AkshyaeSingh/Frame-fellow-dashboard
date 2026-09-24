"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact } from "@/lib/format";

// Chart conventions (dataviz skill): one y-axis, thin marks with 4px rounded
// data-ends, 2px surface gaps, recessive grid, legend for ≥2 series, hover
// tooltips on every mark, text in text tokens (never series color).

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };
const GRID = "var(--border)";

function fmtWeek(t: number) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

type WeekRow = { t: number; aiSafetyViews: number; views: number; aiSafetyPosts: number; posts: number };

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-muted-foreground">
          {r.color && <span className="size-2 rounded-sm" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

// Weekly views, split AI-safety vs other, with fellowship window(s) shaded.
export function WeeklyViewsChart({
  data,
  windows,
  metric = "views",
  height = 240,
}: {
  data: WeekRow[];
  windows: { from: number; to: number; label: string }[];
  metric?: "views" | "posts";
  height?: number;
}) {
  const rows = data.map((d) =>
    metric === "views"
      ? { t: d.t, safety: d.aiSafetyViews, other: Math.max(0, d.views - d.aiSafetyViews) }
      : { t: d.t, safety: d.aiSafetyPosts, other: Math.max(0, d.posts - d.aiSafetyPosts) },
  );
  const unit = metric === "views" ? "views" : "posts";
  // Category axis (one band per week) so bars get real width; snap the
  // shaded windows onto the week buckets they cover.
  const ts = rows.map((r) => r.t);
  const snapped = windows
    .map((w) => {
      const inside = ts.filter((t) => t + 7 * 86_400_000 > w.from && t <= w.to);
      return inside.length ? { ...w, x1: inside[0]!, x2: inside.at(-1)! } : null;
    })
    .filter((w): w is NonNullable<typeof w> => !!w);
  return (
    <div>
      <Legend
        items={[
          { label: `AI safety ${unit}`, color: "var(--s1)" },
          { label: `Other ${unit}`, color: "var(--muted-mark)" },
          { label: "Fellowship window", color: "color-mix(in oklch, var(--s4) 25%, transparent)" },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke={GRID} />
          {snapped.map((w) => (
            <ReferenceArea key={w.label} x1={w.x1} x2={w.x2} fill="var(--s4)" fillOpacity={0.14} />
          ))}
          <XAxis dataKey="t" type="category" tickFormatter={fmtWeek} tick={AXIS} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tickFormatter={(v) => compact(v)} tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox
                  title={`Week of ${fmtWeek(Number(label))}`}
                  rows={[
                    { label: `AI safety`, value: compact(Number(payload.find((p) => p.dataKey === "safety")?.value ?? 0)), color: "var(--s1)" },
                    { label: `Other`, value: compact(Number(payload.find((p) => p.dataKey === "other")?.value ?? 0)), color: "var(--muted-mark)" },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="safety" stackId="a" fill="var(--s1)" stroke="var(--card)" strokeWidth={1} />
          <Bar dataKey="other" stackId="a" fill="var(--muted-mark)" stroke="var(--card)" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Follower count over time per account. Snapshots are sparse (self-reports +
// scrapes), so points are always drawn.
export function FollowersChart({
  series,
  windows,
  height = 200,
}: {
  series: { key: string; label: string; color: string; points: { t: number; v: number; source: string }[] }[];
  windows: { from: number; to: number; label: string }[];
  height?: number;
}) {
  const ts = [...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b);
  const rows = ts.map((t) => Object.fromEntries([["t", t], ...series.map((s) => [s.key, s.points.find((p) => p.t === t)?.v ?? null])]));
  const allT = [...ts, ...windows.flatMap((w) => [w.from, w.to])];
  return (
    <div>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          {windows.map((w) => (
            <ReferenceArea key={w.label} x1={w.from} x2={w.to} fill="var(--s4)" fillOpacity={0.12} />
          ))}
          <XAxis dataKey="t" type="number" scale="time" domain={[Math.min(...allT), Math.max(...allT)]} tickFormatter={fmtWeek} tick={AXIS} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tickFormatter={(v) => compact(v)} tick={AXIS} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipBox
                  title={fmtWeek(Number(label))}
                  rows={payload
                    .filter((p) => p.value != null)
                    .map((p) => {
                      const s = series.find((x) => x.key === p.dataKey)!;
                      const pt = s.points.find((x) => x.t === Number(label));
                      return { label: `${s.label}${pt ? ` (${pt.source})` : ""}`, value: compact(Number(p.value)), color: s.color };
                    })}
                />
              ) : null
            }
          />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2} connectNulls dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: s.color }} activeDot={{ r: 5 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Horizontal share bars (topics, CTAs, orgs) — single series, direct labels.
export function ShareBars({ rows, total, color = "var(--s1)" }: { rows: { label: string; n: number }[]; total: number; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-xs text-muted-foreground">Nothing detected.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] items-center gap-3 text-xs" title={`${r.n} of ${total} posts`}>
          <span className="truncate">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums text-muted-foreground">
            {r.n} · {total ? Math.round((r.n / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}
