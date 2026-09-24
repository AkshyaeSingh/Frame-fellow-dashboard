import type { Metadata } from "next";
import { SectionTitle } from "@/components/bits";

export const metadata: Metadata = { title: "Methodology" };

// What we track, why, how it's computed, and how it compares to what
// commercial creator-analytics platforms measure. Written for funders.

const LAYERS = [
  {
    title: "1. Output",
    q: "Did Frame change what and how much fellows make?",
    metrics: ["Posts / week before vs during vs after", "Formats (long-form, shorts, reels, threads, articles)", "Platforms added during the fellowship", "Planned vs actual output"],
    status: "Live",
  },
  {
    title: "2. Focus",
    q: "Did their content shift toward AI safety — and stay there?",
    metrics: ["AI safety share of posts (per window)", "Topic mix (x-risk, evals, lab accountability, policy, jobs, kids & chatbots…)", "Persistence: AI safety share in the 90 days after"],
    status: "Live",
  },
  {
    title: "3. Reach",
    q: "How many people saw AI safety content because of this?",
    metrics: ["Views on AI safety posts; median per post", "Outlier multiplier (views ÷ account median)", "Follower trajectory per platform", "Estimated AI-safety viewer-minutes"],
    status: "Live",
  },
  {
    title: "4. Resonance",
    q: "Did it land?",
    metrics: ["Engagement rate", "Saves & shares (strong intent signals on TikTok/IG)", "Comment sentiment & themes", "Audience demographics (Trudy / creator-shared analytics)"],
    status: "Engagement live · comments = phase 2",
  },
  {
    title: "5. Action",
    q: "Did audiences get pointed at something concrete?",
    metrics: ["Calls to action by type (contact lawmaker, petition, protest, course, career, tool, donate)", "Orgs promoted (ControlAI, PauseAI, BlueDot, CAIS, FLI…)", "Link clicks / sign-ups where partners share them"],
    status: "CTAs & orgs live · conversions need partner data",
  },
  {
    title: "6. Quality",
    q: "Is it accurate and does it help the field?",
    metrics: ["Claims extracted from transcripts, checked against a ground-truth file", "Framing (alarm / explainer / hopeful / political / personal)", "Sponsored content & conflicts of interest"],
    status: "Pipeline built · needs ANTHROPIC_API_KEY",
  },
  {
    title: "7. Trajectory & outcomes",
    q: "What happened to the fellow — and would it have happened anyway?",
    metrics: ["Outcomes log (press, collabs, grants, jobs, events, virality, policy)", "Attribution per outcome: direct / contributed / unrelated, with evidence", "Self-reported counterfactual (onboarding & exit forms)", "Partner-fit scores (Trudy) for org matching"],
    status: "Live · team curates attribution",
  },
];

const INDUSTRY = [
  { who: "CreatorIQ, GRIN, Upfluence", what: "Reach, engagement rate, earned media value (EMV), audience demographics, brand mentions, campaign ROI", take: "We borrow engagement & mention tracking; EMV is replaced by AI-safety viewer-minutes (dollar-free, mission-aligned)." },
  { who: "Modash, HypeAuditor", what: "Audience quality / fake-follower score, growth anomalies, audience overlap, credibility", take: "Phase 2: audience overlap between fellows; growth-anomaly flags on follower snapshots." },
  { who: "Social Blade", what: "Daily follower/view trajectories and projections", take: "Our follower snapshots accrue with every scheduled scrape to build the same curves." },
  { who: "YouTube Studio / TikTok & IG Insights", what: "Retention, CTR, watch time, traffic sources, demographics", take: "Only creators can export these — ask fellows for monthly screenshots to replace our watch-share estimate." },
  { who: "Trudy", what: "Brand-fit score, content/audience/persuasion fit, expected views & conversions", take: "Stored per fellow × org for matching Amplifier-track partners and campaigns." },
  { who: "Swayable, Harmony Labs, Blue Rose", what: "Persuasion lift from randomized creative testing; narrative research", take: "The gold standard for 'did minds change'. Worth piloting on 3–5 flagship pieces per cohort." },
  { who: "Manifund's AI-safety YouTuber analysis", what: "Quality-adjusted viewer-minutes per dollar", take: "Our viewer-minutes estimate follows this framing so fellows can be compared with other funded channels." },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Methodology</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How we measure what Frame fellows do, and what we can and can&apos;t claim about counterfactual impact. Built for the Frame team and funders.
        </p>
      </div>

      <section>
        <SectionTitle>The seven layers we track</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {LAYERS.map((l) => (
            <div key={l.title} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{l.title}</p>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{l.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{l.q}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm">
                {l.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Counterfactual design</SectionTitle>
        <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
          <p>
            <span className="font-medium">Within-person comparison.</span> Each fellow is compared with their own 90 days before the fellowship, the fellowship itself, and up to 90 days after. This controls for who
            they are, but not for trends (e.g. AI becoming more newsworthy for everyone).
          </p>
          <p>
            <span className="font-medium">Comparison group (next step).</span> Accepted-but-didn&apos;t-attend applicants and waitlisted creators are the natural control. Tracking 10–20 of them the same way turns
            before/after into difference-in-differences — the strongest claim we can make without randomization.
          </p>
          <p>
            <span className="font-medium">Persistence.</span> The &ldquo;after&rdquo; window shows whether AI safety focus and cadence stick once support ends — the key question for a fellowship vs a grant.
          </p>
          <p>
            <span className="font-medium">Attribution.</span> Outcomes are tagged direct / contributed / unrelated with evidence, combining fellows&apos; own words (onboarding: &ldquo;what would you have done
            otherwise?&rdquo;, exit: &ldquo;what couldn&apos;t have happened without it?&rdquo;) with team judgement.
          </p>
          <p>
            <span className="font-medium">Cohort-level self-report.</span> The anonymous exit survey (e.g. &ldquo;more valuable than a grant?&rdquo;) is reported only in aggregate and never linked to a fellow.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle>How metrics are computed</SectionTitle>
        <dl className="divide-y rounded-lg border bg-card text-sm">
          {[
            ["AI safety relevance", "Rule-based first pass: keyword families per topic, matched in title, caption, hashtags and transcript (0–1 score, ≥0.3 counts as AI safety). Every tag records which terms matched. An LLM pass refines it where transcripts exist."],
            ["Calls to action", "Detected from captions, descriptions, links and transcripts. “Action CTAs” are asks for real-world action (lawmaker, petition, protest, course, career, tool, donate) — not follows or likes."],
            ["Views", "As reported by the platform at the time of scraping. Views keep growing, so recent posts are undercounted; medians and per-week rates keep windows comparable."],
            ["Est. viewer-minutes", "views × typical watch share (60% ≤90s, 35% ≤10 min, 25% longer) × length × AI-safety relevance. An estimate — replace with real retention when fellows share analytics."],
            ["Followers", "Snapshots from each scrape plus self-reports from forms. Sparse at first; accrues over time."],
            ["Accuracy check", "Claims are extracted from transcripts and compared with data/ground-truth.md (curated by the team). Verdicts: supported, contested, unsupported, misleading, unverifiable. A human reviews flagged claims."],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-3 md:grid-cols-[12rem_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionTitle>What commercial platforms track — and what we take from them</SectionTitle>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">What they measure</th>
                <th className="px-3 py-2 font-medium">What we use</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRY.map((r) => (
                <tr key={r.who} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 font-medium">{r.who}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.what}</td>
                  <td className="px-3 py-2">{r.take}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>Phase 2</SectionTitle>
        <ul className="list-disc space-y-1 rounded-lg border bg-card p-4 pl-8 text-sm">
          <li>Comment scraping + analysis: sentiment, recurring questions, “changed my mind” signals, audience pushback.</li>
          <li>What else fellows push: sponsors, affiliate links, other causes — from descriptions, links and transcripts.</li>
          <li>LinkedIn, Substack and podcast tracking; career moves from LinkedIn (roles at AI safety orgs).</li>
          <li>Web mentions: press coverage and citations of fellows&apos; work.</li>
          <li>Comparison group of non-fellow applicants (difference-in-differences).</li>
          <li>Partner-shared conversions (sign-ups, petition signatures, course enrollments) attributed to fellow links/codes.</li>
        </ul>
      </section>

      <section>
        <SectionTitle>Limitations to state plainly</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Scrapers see public data only; Stories, private analytics and deleted posts are missing.</li>
          <li>The X scraper is limited on Apify&apos;s free plan (10 tweets/run).</li>
          <li>Keyword tagging misses AI safety content that never names the topic (e.g. “Gen Z is quiet-quitting the human race”) and can over-tag general AI content — the LLM pass and manual review correct this.</li>
          <li>Several fellows have no handles yet — their rows show as untracked rather than zero.</li>
        </ul>
      </section>
    </div>
  );
}
