import Link from "next/link";
import type { FellowGoal } from "@prisma/client";
import type { ProgramRow } from "@/lib/program-data";
import { BOARD_COLUMNS, STATUSES, STATUS_SCORE, cadenceStatus, isAmplifier } from "@/lib/checklist";
import { HEALTH_OPTIONS } from "@/lib/fellow-fields";
import { ProgressRing } from "@/components/progress-ring";
import { StatusPill } from "@/components/status-pill";
import { FellowField } from "@/components/fellow-field";
import { CreatorAvatar } from "@/components/creator-avatar";
import { setGoalStatusAction } from "./program-actions";

export type Checklists = Map<string, FellowGoal[]>;

// The checklist as shown: the cadence item follows the cadence plan.
export function liveGoals(r: ProgramRow, goals: FellowGoal[] = []) {
  return goals.map((g) => (g.key === "cadence" ? { ...g, status: cadenceStatus(r.cadence.health) } : g));
}

export const progressOf = (goals: { status: string }[]) => (goals.length ? goals.reduce((s, g) => s + (STATUS_SCORE[g.status] ?? 0), 0) / goals.length : 0);

const orgOf = (r: ProgramRow) => r.f.partnerOrg?.replace(/\s*\(.*\)\s*$/, "").replace(/-.*$/, "").trim();

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {STATUSES.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="size-3 rounded-full border-[3px] border-foreground" /> Amplifier org
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-3 rounded-full border border-border" /> Independent
      </span>
    </div>
  );
}

// Fellows arranged in a ring (the "fellow-first database"). Each avatar is
// wrapped in its checklist; click through to the profile.
export function CommunityRing({ rows, checklists, title, subtitle }: { rows: ProgramRow[]; checklists: Checklists; title: string; subtitle: string }) {
  const items = rows.map((r) => {
    const goals = liveGoals(r, checklists.get(r.f.id));
    return { r, goals, pct: progressOf(goals) };
  });
  const card = (x: (typeof items)[number], size: number) => (
    <Link href={`/fellows/${x.r.f.slug}`} className="group flex flex-col items-center gap-1 text-center" title={x.goals.map((g) => `${g.title}: ${STATUSES.find((s) => s.key === g.status)?.label}`).join("\n")}>
      <ProgressRing name={x.r.f.name} src={x.r.f.accounts.find((a) => a.avatarUrl)?.avatarUrl} statuses={x.goals.map((g) => g.status)} amplifier={isAmplifier(x.r.f.track)} size={size} className="transition-transform group-hover:scale-105" />
      <span className="text-xs leading-tight font-medium group-hover:underline">{x.r.f.name.split(" ")[0]}</span>
      {isAmplifier(x.r.f.track) && orgOf(x.r) && <span className="-mt-0.5 max-w-24 truncate text-[10px] text-muted-foreground">{orgOf(x.r)}</span>}
    </Link>
  );
  const avg = items.length ? items.reduce((s, x) => s + x.pct, 0) / items.length : 0;
  const all = items.flatMap((x) => x.goals);
  return (
    <div>
      <div className="relative mx-auto hidden aspect-square w-full max-w-[640px] sm:block">
        {items.map((x, i) => {
          const a = -Math.PI / 2 + (i / items.length) * 2 * Math.PI;
          return (
            <div key={x.r.f.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + 41 * Math.cos(a)}%`, top: `${50 + 41 * Math.sin(a)}%` }}>
              {card(x, 76)}
            </div>
          );
        })}
        <div className="absolute inset-[24%] flex flex-col items-center justify-center rounded-full text-center">
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{Math.round(avg * 100)}%</p>
          <p className="text-[11px] text-muted-foreground">average checklist progress</p>
          <div className="mt-3 flex h-2 w-40 overflow-hidden rounded-full">
            {STATUSES.map((s) => {
              const n = all.filter((g) => g.status === s.key).length;
              return n ? <div key={s.key} style={{ width: `${(n / all.length) * 100}%`, background: s.color }} title={`${s.label}: ${n}`} /> : null;
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:hidden">{items.map((x) => <div key={x.r.f.id}>{card(x, 72)}</div>)}</div>
      <div className="mt-4">
        <StatusLegend />
      </div>
    </div>
  );
}

// Monday-style board: one row per fellow, one coloured status column per checklist item.
export function ProgressBoard({ rows, checklists }: { rows: ProgramRow[]; checklists: Checklists }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">Fellow</th>
            <th className="px-2 py-2 font-medium">How we feel</th>
            {BOARD_COLUMNS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="min-w-56 px-3 py-2 font-medium">How we can support</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const goals = liveGoals(r, checklists.get(r.f.id));
            const pct = progressOf(goals);
            return (
              <tr key={r.f.id} className="border-t align-middle">
                <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                  <Link href={`/fellows/${r.f.slug}`} className="flex items-center gap-2 font-medium whitespace-nowrap hover:underline">
                    <CreatorAvatar name={r.f.name} src={r.f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-6 text-[10px]" />
                    <span>
                      {r.f.name}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {isAmplifier(r.f.track) ? orgOf(r) : "Independent"} · {Math.round(pct * 100)}%
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-1.5">
                  <div className="w-28">
                    <FellowField fellowId={r.f.id} field="health" value={r.f.health} display={<span className="text-xs">{HEALTH_OPTIONS.find(([k]) => k === r.f.health)?.[1] ?? "Set…"}</span>} />
                  </div>
                </td>
                {BOARD_COLUMNS.map((c) => {
                  const g = goals.find((x) => x.key === c.key);
                  return (
                    <td key={c.key} className="px-1 py-1.5">
                      {g ? (
                        <StatusPill status={g.status} readOnly={c.key === "cadence"} title={c.key === "cadence" ? "Follows their cadence plan" : (g.note ?? undefined)} onChange={setGoalStatusAction.bind(null, g.id)} />
                      ) : (
                        <span className="block text-center text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5">
                  <FellowField fellowId={r.f.id} field="needs" value={r.f.needs} className="text-xs" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
