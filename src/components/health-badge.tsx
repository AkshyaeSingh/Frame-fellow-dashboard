import { HEALTH_LABEL, type Health } from "@/lib/program";
import { cn } from "@/lib/utils";

export const HEALTH_STYLE: Record<string, string> = {
  "on-track": "bg-good/15 text-good",
  done: "bg-good/15 text-good",
  behind: "bg-s4/25 text-foreground",
  "off-track": "bg-bad/15 text-bad",
  "needs-help": "bg-bad/15 text-bad",
  paused: "bg-muted text-muted-foreground",
  "no-plan": "bg-muted text-muted-foreground",
  "not-started": "bg-muted text-muted-foreground",
};

export function HealthBadge({ health, pace, className }: { health: string; pace?: number | null; className?: string }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs whitespace-nowrap", HEALTH_STYLE[health], className)}>
      {HEALTH_LABEL[health as Health] ?? health}
      {pace != null && <span className="opacity-70"> · {Math.round(pace * 100)}% of plan</span>}
    </span>
  );
}
