import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { SLACK_SIGNALS } from "@/lib/slack";
import { daysAgo, shortDate } from "@/lib/format";
import { SectionTitle } from "@/components/bits";

const SHOW = ["concern", "win", "event", "ask", "feedback"];

// Team-only: what the fellow has been saying in Frame Slack channels.
export async function SlackPanel({ fellowId }: { fellowId: string }) {
  const f = await db.fellow.findUniqueOrThrow({ where: { id: fellowId }, select: { slackUserId: true } });
  if (!f.slackUserId)
    return (
      <section>
        <SectionTitle>Slack</SectionTitle>
        <p className="text-xs text-muted-foreground">
          Not linked. Add their Slack user ID in Overview → Support, or in the table on Home{process.env.SLACK_BOT_TOKEN ? ", or it links automatically when their Slack name matches." : ". Slack sync needs SLACK_BOT_TOKEN."}
        </p>
      </section>
    );
  const since = daysAgo(30);
  const msgs = await db.slackMessage.findMany({ where: { fellowId, postedAt: { gte: daysAgo(90) } }, orderBy: { postedAt: "desc" } });
  const recent = msgs.filter((m) => m.postedAt >= since);
  const flagged = msgs.filter((m) => m.signals.some((s) => SHOW.includes(s))).slice(0, 8);
  const channels = [...new Set(recent.map((m) => m.channel))].filter(Boolean);
  return (
    <section>
      <SectionTitle hint="Channels the Frame bot is in. Last 30 days.">Slack</SectionTitle>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Num n={recent.length} label="messages" />
        <Num n={recent.filter((m) => !m.threadTs).length} label="threads started" />
        <Num n={recent.reduce((a, m) => a + m.reactions, 0)} label="reactions" />
      </div>
      {channels.length > 0 && <p className="mt-1 text-[11px] text-muted-foreground">Active in {channels.map((c) => `#${c}`).join(", ")}</p>}
      <ul className="mt-3 space-y-2">
        {flagged.map((m) => (
          <li key={m.id} className="rounded-md bg-muted/60 px-2 py-1.5 text-xs">
            <p className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              {m.signals
                .filter((s) => SHOW.includes(s))
                .map((s) => SLACK_SIGNALS.find((x) => x.slug === s)?.label)
                .join(" · ")}{" "}
              · {shortDate(m.postedAt)}
              {m.permalink && (
                <a href={m.permalink} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground">
                  <ExternalLink className="size-3" />
                </a>
              )}
            </p>
            <p className="line-clamp-4 whitespace-pre-wrap">{m.text}</p>
          </li>
        ))}
        {!flagged.length && <li className="text-xs text-muted-foreground">Nothing flagged in the last 90 days.</li>}
      </ul>
    </section>
  );
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-md border px-1 py-1.5">
      <p className="text-base font-semibold tabular-nums">{n}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
