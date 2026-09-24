import type { FellowFull } from "@/lib/data";
import { compact, shortDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { Empty, SectionTitle } from "@/components/bits";
import { addTrudyAction, deleteTrudyAction } from "../../team-actions";

type Demo = { male?: number | null; female?: number | null; age?: Record<string, number> | null; countries?: { code: string; pct: number }[] | null };
type Metrics = { followers?: number | null; avgViews?: number | null; engagementRate?: number | null };
type Safety = { contentStyle?: string | null; controversialTopics?: string | null };

export function TrudyTab({ f, isTeam }: { f: FellowFull; isTeam: boolean }) {
  return (
    <div className="space-y-6">
      <SectionTitle hint="Creator–partner fit scored by Trudy against specific brands, orgs or topics. Use it to match fellows with orgs and campaigns.">
        Partner fit reports
      </SectionTitle>
      {f.trudy.map((t) => (
        <TrudyCard key={t.id} t={t} isTeam={isTeam} />
      ))}
      {!f.trudy.length && <Empty>No Trudy reports yet.</Empty>}
      {isTeam && <TrudyForm fellowId={f.id} />}
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  // Half-circle gauge; arc length proportional to score.
  const r = 52;
  const len = Math.PI * r;
  const color = score >= 70 ? "var(--good)" : score >= 45 ? "var(--s4)" : "var(--bad)";
  return (
    <svg viewBox="0 0 128 76" className="w-36" role="img" aria-label={`Score ${score} out of 100`}>
      <path d="M12 66 A52 52 0 0 1 116 66" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round" />
      <path d="M12 66 A52 52 0 0 1 116 66" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} />
      <text x="64" y="58" textAnchor="middle" className="fill-foreground" style={{ fontSize: 26, fontWeight: 600 }}>
        {score}
      </text>
      <text x="64" y="72" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>
        /100 Trudy score
      </text>
    </svg>
  );
}

function Fit({ label, v, notes }: { label: string; v: number | null; notes: string[] }) {
  const color = v == null ? "var(--muted)" : v >= 70 ? "var(--good)" : v >= 45 ? "var(--s4)" : "var(--bad)";
  return (
    <div className="rounded-md bg-muted/60 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {v ?? "–"}
        <span className="text-xs font-normal text-muted-foreground">/100</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: color }} />
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function TrudyCard({ t, isTeam }: { t: FellowFull["trudy"][number]; isTeam: boolean }) {
  const d = (t.demographics ?? {}) as Demo;
  const m = (t.metrics ?? {}) as Metrics;
  const s = (t.brandSafety ?? {}) as Safety;
  const age = d.age ? Object.entries(d.age) : [];
  const maxAge = Math.max(1, ...age.map(([, v]) => v));
  return (
    <article className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-sm">
        <p>
          vs. <span className="font-semibold">{t.against}</span>
          {t.againstCategory && <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">{t.againstCategory}</span>}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Trudy{t.platform ? ` · ${PLATFORM_LABEL[t.platform]}` : ""} · {t.reportDate ? shortDate(t.reportDate) : ""}
          </span>
          {isTeam && (
            <form action={deleteTrudyAction.bind(null, t.id)}>
              <button className="hover:text-bad">Delete</button>
            </form>
          )}
        </div>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {t.score != null && <Gauge score={t.score} />}
            <ul className="space-y-1 text-sm">
              {t.insights.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Fit label="Content fit" v={t.contentFit} notes={t.contentNotes} />
            <Fit label="Audience fit" v={t.audienceFit} notes={t.audienceNotes} />
            <Fit label="Persuasion fit" v={t.persuasionFit} notes={t.persuasionNotes} />
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Followers" v={compact(m.followers)} />
            <Metric label="Avg views" v={compact(m.avgViews)} />
            <Metric label="Engagement" v={m.engagementRate != null ? `${m.engagementRate}%` : "—"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Gender</p>
              {d.male != null && d.female != null ? (
                <>
                  <div className="flex h-2 overflow-hidden rounded-full">
                    <div style={{ width: `${d.male}%`, background: "var(--s7)" }} />
                    <div className="ml-0.5" style={{ width: `${d.female}%`, background: "var(--s5)" }} />
                  </div>
                  <p className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Male {d.male}%</span>
                    <span>Female {d.female}%</span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Age</p>
              {age.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2 text-xs">
                  <span>{k}</span>
                  <span className="h-1.5 rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-s7" style={{ width: `${(v / maxAge) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{v}%</span>
                </div>
              ))}
              {!age.length && <p className="text-xs text-muted-foreground">—</p>}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Top countries</p>
            <div className="flex flex-wrap gap-1">
              {(d.countries ?? []).map((c) => (
                <span key={c.code} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {c.code} <span className="text-muted-foreground">{c.pct}%</span>
                </span>
              ))}
              {!d.countries?.length && <span className="text-xs text-muted-foreground">Not confident / not reported</span>}
            </div>
          </div>
          {t.contentSummary && <p className="text-sm">{t.contentSummary}</p>}
          <div className="flex flex-wrap gap-1 text-xs">
            {s.contentStyle && <span className="rounded bg-good/15 px-1.5 py-0.5 text-good">Content style: {s.contentStyle}</span>}
            {s.controversialTopics && <span className="rounded bg-s4/20 px-1.5 py-0.5">Controversial topics: {s.controversialTopics}</span>}
          </div>
          {(t.expectedViews != null || t.estConversions != null) && (
            <div className="flex gap-6 rounded-md bg-foreground px-3 py-2 text-background">
              <p>
                <span className="text-lg font-semibold">{compact(t.expectedViews)}</span> <span className="text-xs opacity-75">expected views / post</span>
              </p>
              <p>
                <span className="text-lg font-semibold">{t.estConversions ?? "—"}</span>{" "}
                <span className="text-xs opacity-75">est. conversions{t.conversionRate != null ? ` at ${t.conversionRate}%` : ""}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md border px-2.5 py-2">
      <p className="text-base font-semibold tabular-nums">{v}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TrudyForm({ fellowId }: { fellowId: string }) {
  const inp = "h-8 rounded-md border bg-background px-2 text-sm";
  const ta = "min-h-16 rounded-md border bg-background px-2 py-1 text-sm";
  return (
    <details className="rounded-lg border border-dashed p-4">
      <summary className="cursor-pointer text-sm font-medium">+ Add a Trudy report (copy from Trudy)</summary>
      <form action={addTrudyAction.bind(null, fellowId)} className="mt-4 grid gap-2 md:grid-cols-4">
        <input name="against" required placeholder="Scored against (brand / org / topic)" className={`${inp} md:col-span-2`} />
        <input name="againstCategory" placeholder="Category (e.g. AI safety native)" className={inp} />
        <select name="platform" className={inp} defaultValue="">
          <option value="">Platform</option>
          {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="score" type="number" placeholder="Trudy score" className={inp} />
        <input name="contentFit" type="number" placeholder="Content fit" className={inp} />
        <input name="audienceFit" type="number" placeholder="Audience fit" className={inp} />
        <input name="persuasionFit" type="number" placeholder="Persuasion fit" className={inp} />
        <textarea name="insights" placeholder="Key insights (one per line)" className={`${ta} md:col-span-4`} />
        <textarea name="contentNotes" placeholder="Content fit notes (one per line)" className={ta} />
        <textarea name="audienceNotes" placeholder="Audience fit notes" className={ta} />
        <textarea name="persuasionNotes" placeholder="Persuasion fit notes" className={ta} />
        <input name="reportDate" type="date" className={inp} />
        <input name="followers" placeholder="Followers" className={inp} />
        <input name="avgViews" placeholder="Avg views" className={inp} />
        <input name="engagementRate" placeholder="Engagement %" className={inp} />
        <input name="male" placeholder="Male %" className={inp} />
        <input name="female" placeholder="Female %" className={inp} />
        <textarea name="age" placeholder={"Age, one per line:\n18-24 15.8\n25-34 54.6"} className={ta} />
        <textarea name="countries" placeholder={"Countries:\nUS 59.3\nIN 25.2"} className={ta} />
        <textarea name="contentSummary" placeholder="Content summary" className={`${ta} md:col-span-4`} />
        <input name="contentStyle" placeholder="Brand safety: content style (Ok)" className={inp} />
        <input name="controversialTopics" placeholder="Controversial topics (Moderate)" className={inp} />
        <input name="expectedViews" placeholder="Expected views / post" className={inp} />
        <input name="estConversions" placeholder="Est. conversions" className={inp} />
        <input name="conversionRate" placeholder="Conversion rate %" className={inp} />
        <button className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground md:col-start-4">Save report</button>
      </form>
    </details>
  );
}
