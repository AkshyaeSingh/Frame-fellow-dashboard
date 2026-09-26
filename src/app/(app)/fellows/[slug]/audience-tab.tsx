import { ExternalLink, Heart } from "lucide-react";
import { audienceSummary } from "@/lib/audience";
import { COMMENT_SIGNALS } from "@/lib/analysis/comments";
import { compact, pct, shortDate } from "@/lib/format";
import { Empty, SectionTitle, StatTile } from "@/components/bits";

const SENT = [
  { key: "positive", label: "Positive", color: "var(--good)" },
  { key: "neutral", label: "Neutral", color: "var(--muted-foreground)" },
  { key: "mixed", label: "Mixed", color: "var(--s4)" },
  { key: "negative", label: "Negative", color: "var(--bad)" },
];

const EXAMPLES = ["changed-mind", "learned", "action", "pushback", "doomer-label", "question", "wants-more"];

export async function AudienceTab({ fellowId }: { fellowId: string }) {
  const a = await audienceSummary({ fellowId });
  if (!a.total) return <Empty>No comments scraped yet for this fellow. Comments are pulled weekly for new posts (YouTube, TikTok, Instagram).</Empty>;
  const rate = (slug: string) => (a.signals[slug] ?? 0) / a.total;
  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        {a.total.toLocaleString()} audience comments across {a.posts.length} posts (creator replies excluded). Tagged by keyword rules, which are transparent but
        literal: sarcasm and nuance are missed. Treat rates as directional and read the examples.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Changed mind / learned" value={pct(rate("changed-mind") + rate("learned"))} sub={`${(a.signals["changed-mind"] ?? 0) + (a.signals["learned"] ?? 0)} comments`} />
        <StatTile label="Action intent" value={pct(rate("action"))} sub={`${a.signals["action"]} comments (share, sign, contact…)`} />
        <StatTile label="Pushback or 'doomer'" value={pct(rate("pushback") + rate("doomer-label"))} sub={`${(a.signals["pushback"] ?? 0) + (a.signals["doomer-label"] ?? 0)} comments`} />
        <StatTile label="Questions" value={pct(rate("question"))} sub="Audience curiosity; good follow-up material" />
      </div>

      <section>
        <SectionTitle>Sentiment</SectionTitle>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {SENT.map((s) => (
            <div key={s.key} style={{ width: `${((a.sentiment[s.key] ?? 0) / a.total) * 100}%`, background: s.color }} title={`${s.label}: ${a.sentiment[s.key]}`} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          {SENT.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label} <span className="tabular-nums text-muted-foreground">{pct((a.sentiment[s.key] ?? 0) / a.total, 0)}</span>
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle hint="Most-liked comments per signal">What the audience is saying</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {EXAMPLES.map((slug) => {
            const sig = COMMENT_SIGNALS.find((s) => s.slug === slug)!;
            const ex = a.bySignal(slug, 4);
            if (!ex.length) return null;
            return (
              <div key={slug} className="rounded-lg border bg-card p-3">
                <p className="mb-2 flex items-center justify-between text-xs font-medium">
                  {sig.label} <span className="font-normal text-muted-foreground">{a.signals[slug]}</span>
                </p>
                <ul className="space-y-2">
                  {ex.map((c) => (
                    <li key={c.id} className="text-sm">
                      <p className="line-clamp-3">“{c.text}”</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {c.author && <span>{c.author}</span>}
                        {c.likes ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Heart className="size-3" />
                            {compact(c.likes)}
                          </span>
                        ) : null}
                        {c.post.url && (
                          <a href={c.post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                            on {(c.post.title ?? c.post.caption ?? "post").slice(0, 40)} <ExternalLink className="size-3" />
                          </a>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="Which pieces moved people vs. drew pushback">By post</SectionTitle>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Post</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
                <th className="px-3 py-2 text-right font-medium">Comments read</th>
                <th className="px-3 py-2 text-right font-medium">Positive</th>
                <th className="px-3 py-2 text-right font-medium">Changed mind / learned</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
                <th className="px-3 py-2 text-right font-medium">Pushback</th>
              </tr>
            </thead>
            <tbody>
              {a.posts.slice(0, 25).map(({ post, n, pos, mind, action, pushback }) => (
                <tr key={post.id} className="border-t">
                  <td className="max-w-md px-3 py-2">
                    <a href={post.url ?? "#"} target="_blank" rel="noopener noreferrer" className="line-clamp-1 hover:underline">
                      {post.title ?? post.caption ?? "Untitled"}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {shortDate(post.publishedAt)}
                      {post.isAiSafety && " · AI safety"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{compact(post.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(pos / n, 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{mind || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{action || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pushback || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
