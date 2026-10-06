import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import type { Resource } from "@prisma/client";
import { eventDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const KIND_LABEL: Record<string, string> = { event: "Event", resource: "Resource", funding: "Funding", person: "Person", opportunity: "Opportunity" };

export function ResourceCard({ r, reasons, children, className }: { r: Resource; reasons?: string[]; children?: React.ReactNode; className?: string }) {
  return (
    <article className={cn("flex flex-col gap-1.5 rounded-lg border bg-card p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{KIND_LABEL[r.kind] ?? r.kind}</p>
          <h3 className="text-sm leading-snug font-medium">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {r.title} <ExternalLink className="inline size-3 text-muted-foreground" />
              </a>
            ) : (
              r.title
            )}
          </h3>
        </div>
      </div>
      {(r.date || r.location) && (
        <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {r.date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {eventDate(r.date, true)}
              {r.endDate && r.endDate.getTime() - r.date.getTime() > 86_400_000 && ` – ${eventDate(r.endDate)}`}
            </span>
          )}
          {r.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {r.location}
            </span>
          )}
        </p>
      )}
      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
      {reasons && reasons.length > 0 && <p className="text-xs">Because {reasons.join(" · ")}</p>}
      {children}
    </article>
  );
}
