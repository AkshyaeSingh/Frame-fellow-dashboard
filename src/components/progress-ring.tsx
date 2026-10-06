import { CreatorAvatar } from "@/components/creator-avatar";
import { statusOf } from "@/lib/checklist";
import { cn } from "@/lib/utils";

// A fellow's avatar wrapped in their checklist: one coloured arc per item.
// Amplifier fellows get a heavy outer band (their org); independents a thin line.
export function ProgressRing({
  name,
  src,
  statuses,
  amplifier,
  size = 88,
  className,
}: {
  name: string;
  src?: string | null;
  statuses: string[];
  amplifier: boolean;
  size?: number;
  className?: string;
}) {
  const c = size / 2;
  const outer = amplifier ? size * 0.075 : size * 0.02;
  const rArc = c - outer - size * 0.07; // checklist arcs
  const arcW = size * 0.07;
  const photoR = rArc - arcW / 2 - size * 0.03;
  const n = Math.max(1, statuses.length);
  const gap = statuses.length > 1 ? 0.06 : 0; // radians between arcs
  const seg = (2 * Math.PI) / n;
  const arc = (i: number) => {
    const a0 = -Math.PI / 2 + i * seg + gap / 2;
    const a1 = a0 + seg - gap;
    const p = (a: number) => `${c + rArc * Math.cos(a)} ${c + rArc * Math.sin(a)}`;
    return `M ${p(a0)} A ${rArc} ${rArc} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  };
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${name}: ${statuses.map((s) => statusOf(s).label).join(", ")}`}>
      {amplifier ? (
        <>
          <circle cx={c} cy={c} r={c - outer / 2} fill="none" stroke="var(--foreground)" strokeWidth={outer} />
          <circle cx={c} cy={c} r={c - outer / 2} fill="none" stroke="var(--background)" strokeWidth={outer * 0.35} strokeDasharray="2 3" />
        </>
      ) : (
        <circle cx={c} cy={c} r={c - outer} fill="none" stroke="var(--border)" strokeWidth={outer * 1.5} />
      )}
      {statuses.length ? (
        statuses.map((s, i) => <path key={i} d={arc(i)} fill="none" stroke={statusOf(s).color} strokeWidth={arcW} strokeLinecap="round" />)
      ) : (
        <circle cx={c} cy={c} r={rArc} fill="none" stroke="var(--status-none)" strokeWidth={arcW} />
      )}
    </svg>
      <CreatorAvatar name={name} src={src} className="absolute" style={{ width: photoR * 2, height: photoR * 2, left: c - photoR, top: c - photoR, fontSize: photoR * 0.6 }} />
    </div>
  );
}
