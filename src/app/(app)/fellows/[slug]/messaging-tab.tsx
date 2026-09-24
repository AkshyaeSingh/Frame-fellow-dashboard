import type { FellowFull } from "@/lib/data";
import { countBy, windowOf } from "@/lib/metrics";
import { CTAS, FRAMINGS, ORGS, TOPICS, labelOf } from "@/lib/taxonomy";
import { ShareBars } from "@/components/charts";
import { Chip, Empty, SectionTitle } from "@/components/bits";
import { cn } from "@/lib/utils";

export type Claim = { claim: string; verdict: "supported" | "contested" | "unsupported" | "misleading" | "unverifiable"; note?: string; reference?: string };
export type LlmAnalysis = {
  summary?: string;
  framing?: string;
  claims?: Claim[];
  accuracyScore?: number;
  ctaText?: string[];
  audience?: string;
};

const VERDICT_STYLE: Record<Claim["verdict"], string> = {
  supported: "bg-good/15 text-good",
  contested: "bg-s4/20",
  unsupported: "bg-bad/15 text-bad",
  misleading: "bg-bad/15 text-bad",
  unverifiable: "bg-muted",
};

export function MessagingTab({ f }: { f: FellowFull }) {
  const tag = (w: string) => f.posts.filter((p) => windowOf(p.publishedAt, f.cohort.startDate, f.cohort.endDate) === w);
  const base = tag("baseline");
  const during = [...tag("during"), ...tag("after")];
  const mix = (ps: typeof f.posts, key: "topics" | "ctas" | "orgsMentioned", list: readonly { slug: string; label: string }[]) =>
    countBy(ps.map((p) => p[key] as string[])).map(([slug, n]) => ({ label: labelOf(list, slug), n }));

  const llm = f.posts.filter((p) => p.analyzedBy && p.analyzedBy !== "rules-v1");
  const claims = llm.flatMap((p) => ((p.analysis as LlmAnalysis | null)?.claims ?? []).map((c) => ({ ...c, post: p })));
  const flagged = claims.filter((c) => c.verdict === "unsupported" || c.verdict === "misleading" || c.verdict === "contested");
  const framing = countBy(llm.map((p) => (p.framing ? [p.framing] : []))).map(([slug, n]) => ({ label: labelOf(FRAMINGS, slug), n }));

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Topics — before" n={base.length}>
          <ShareBars rows={mix(base, "topics", TOPICS)} total={base.length} color="var(--muted-mark)" />
        </Panel>
        <Panel title="Topics — during & after" n={during.length}>
          <ShareBars rows={mix(during, "topics", TOPICS)} total={during.length} />
        </Panel>
        <Panel title="Calls to action — before" n={base.length}>
          <ShareBars rows={mix(base, "ctas", CTAS)} total={base.length} color="var(--muted-mark)" />
        </Panel>
        <Panel title="Calls to action — during & after" n={during.length}>
          <ShareBars rows={mix(during, "ctas", CTAS)} total={during.length} color="var(--s3)" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Organizations promoted or cited (all time)" n={f.posts.length} hint="What the fellow is pushing — detected from captions, links and transcripts.">
          <ShareBars rows={mix(f.posts, "orgsMentioned", ORGS)} total={f.posts.length} color="var(--s7)" />
        </Panel>
        <Panel title="Framing" n={llm.length} hint="From the LLM pass (npm run analyze:llm); rule-based tagging can't judge tone.">
          {framing.length ? <ShareBars rows={framing} total={llm.length} color="var(--s5)" /> : null}
        </Panel>
      </div>

      <section>
        <SectionTitle hint="Claims extracted from transcripts and checked against data/ground-truth.md. Contested or unsupported claims need a human look — the model can be wrong.">
          Accuracy check vs ground truth
        </SectionTitle>
        {!llm.length ? (
          <Empty>
            No LLM analysis yet. Run <code>npm run analyze:llm -- --fellow {f.slug}</code> (needs ANTHROPIC_API_KEY).
          </Empty>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {llm.length} posts analyzed · {claims.length} claims · <span className="font-medium text-foreground">{flagged.length} flagged</span>
            </p>
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {(flagged.length ? flagged : claims).slice(0, 40).map((c, i) => (
                <li key={i} className="grid gap-1 px-3 py-2 sm:grid-cols-[7rem_1fr]">
                  <Chip className={cn("h-fit w-fit", VERDICT_STYLE[c.verdict])}>{c.verdict}</Chip>
                  <div>
                    <p>{c.claim}</p>
                    {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                    <a href={c.post.url ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                      {c.post.title ?? c.post.caption?.slice(0, 80)}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Panel({ title, n, hint, children }: { title: string; n: number; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <SectionTitle hint={hint}>
        {title} <span className="font-normal text-muted-foreground">· {n} posts</span>
      </SectionTitle>
      {n ? children ?? <p className="text-xs text-muted-foreground">Nothing detected.</p> : <p className="text-xs text-muted-foreground">No posts in this window.</p>}
    </section>
  );
}
