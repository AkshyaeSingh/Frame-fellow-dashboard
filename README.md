# Frame · Fellow Impact

Internal dashboard for tracking everything Frame fellows publish, across platforms and cohorts, and for showing funders what changed because of the fellowship. **Private:** team and funders only, and every page sits behind a password.

## What it does

| Page | What's there |
|---|---|
| **Overview** `/` | Portfolio KPIs by cohort, weekly output chart with fellowship windows shaded, and a per-fellow table comparing before → during → after. Also cohort-level results from the anonymous exit survey. |
| **Fellow** `/fellows/[slug]` | **Impact:** before/during/after scorecard, trajectory, followers, outcomes with counterfactual attribution, and the fellow's own counterfactual answers. **Content:** every post, with outlier multiplier, AI-safety score, topics, CTAs and orgs. **Messaging & CTAs:** topic, CTA and org mix before vs during, plus the claim-accuracy check. **Partner fit (Trudy):** Trudy reports per brand/org. **Audience response:** sentiment and signals (changed mind, learned, action intent, pushback, questions) across scraped comments, with the most-liked examples per signal and a per-post breakdown. **Forms:** curated intake, onboarding and exit answers. **Context & meetings** (team only): Granola meeting notes, decisions, action items and feedback on a timeline, plus follow-ups pulled from each meeting's next steps. |
| **Content** `/content` | Search and filter every post across fellows, including transcripts. |
| **Outliers** `/outliers` | Posts that beat or missed the creator's own normal (views ÷ median of their previous 20 posts), with the topics that are over-represented among them. |
| **Methodology** `/methodology` | The seven metric layers, the counterfactual design, how each number is computed, and how this compares with what CreatorIQ, Modash, Trudy, Swayable and others track. Written for funders. |
| **Data & scraping** `/data` | Team only. Tracked handles, Apify runs, dataset import, one-click scrape. |

**Roles:** `TEAM_PASSWORD` gives full access and editing. `FUNDER_PASSWORD` is read-only, with private form answers and team notes hidden.

## Data pipeline

```
Apify actors (YouTube, Instagram, TikTok, X, LinkedIn)
   │  webhook on success  (/api/apify-webhook?token=WEBHOOK_SECRET — same payload as Frame-Agent)
   │  or: "Start scrape" / "Import dataset" on /data, or npm run import:apify
   ▼
normalize per platform (src/lib/ingest/normalize.ts, ported from Frame-Agent + TikTok/X)
   ▼
only accounts listed in the roster are stored ─► posts, daily follower snapshots, transcripts
   ▼
rule-based tagging (src/lib/analysis/rules.ts): AI-safety score, topics, CTAs, orgs, sponsored
   ▼
optional LLM pass (npm run analyze:llm): summary, framing, CTA wording, other promotions,
claims checked against data/ground-truth.md
```

Form responses (Google Forms CSV exports) come in through `npm run import:forms`. Private fields are dropped at import and never stored: phone numbers, birthdays, emergency contacts, health/accessibility, sizes, food and housing. The anonymous exit survey is stored at cohort level only.

## Setup

```bash
createdb fellow_impact
cp .env.example .env        # DATABASE_URL, SESSION_SECRET, TEAM_PASSWORD (+ FUNDER_PASSWORD)
npm install
npx prisma migrate dev
npm run db:seed             # cohorts, fellows, handles from data/roster.ts
npm run import:forms        # reads the CSVs from ~/Downloads (or pass a folder)
npm run import:apify        # imports every dataset listed in data/roster.ts
npx tsx scripts/seed-trudy.ts
npm run dev
```

| Env var | Needed for |
|---|---|
| `APIFY_TOKEN` | Starting scrapes from the dashboard (imports by dataset ID work without it) |
| `WEBHOOK_SECRET`, `PUBLIC_URL` | Automatic import when Apify runs finish |
| `ANTHROPIC_API_KEY` | `npm run analyze:llm` (Claude Opus 5 with server-side refusal fallbacks) |

## Hosting (GitHub + Vercel + Neon)

The app deploys as-is to **Vercel** with a **Neon** Postgres database. It's the same setup as the fellow dashboard.

1. **Database:** create a Neon project, then copy the pooled connection string (`DATABASE_URL`) and the direct one (`DIRECT_URL`). Load the schema and data:
   ```bash
   DATABASE_URL=<neon-direct-url> npx prisma migrate deploy      # empty schema
   psql "<neon-direct-url>" < fellow-impact-data.sql               # or: restore a dump of the local DB
   ```
2. **Vercel:** import the GitHub repo. Framework: Next.js (auto-detected). Set these env vars: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `TEAM_PASSWORD`, `FUNDER_PASSWORD`, `APIFY_TOKEN`, `WEBHOOK_SECRET`, `PUBLIC_URL` (the Vercel URL), and optionally `ANTHROPIC_API_KEY`.
3. **Apify:** point each scheduled task's "Run succeeded" webhook at `https://<your-app>.vercel.app/api/apify-webhook?token=<WEBHOOK_SECRET>`.
4. **Scripts:** run them from a laptop against the hosted DB by putting the Neon URL in your local `.env` (import:forms, analyze:llm, seed-trudy).

**Never commit** `.env`, form CSVs or database dumps. They contain fellows' personal data. `.gitignore` covers `.env*` and the CSVs live outside the repo.

## Working on it together

- Keep the GitHub repo **private**, and add teammates as collaborators.
- Use branches and pull requests for code changes. Vercel gives every PR its own preview URL.
- Change the roster and handles on the `/data` page. It writes to the shared DB, so everyone sees the change immediately. `data/roster.ts` is only the initial seed.
- Everyone signs in with the shared `TEAM_PASSWORD`, and funders with `FUNDER_PASSWORD`. Per-person logins can come later.

## Keeping it current

- **Handles:** edit them on `/data`, or in `data/roster.ts` and re-seed.
- **Weekly automation (`vercel.json`):** Monday 06:00 UTC `/api/cron/weekly-scrape` starts Apify runs for the last 21 days of posts on every tracked account, plus comments on posts from the last 30 days. Each run calls `/api/apify-webhook` when it finishes, which imports it. Monday 15:00 UTC `/api/cron/digest` posts a summary to Slack: output, outliers, audience signals, quiet fellows, open action items and failed runs. Needs these Vercel env vars: `APIFY_TOKEN`, `PUBLIC_URL`, `WEBHOOK_SECRET`, `CRON_SECRET`, `SLACK_WEBHOOK_URL`. Preview the digest with `/api/cron/digest?dry=1&token=$CRON_SECRET`.
- **Fellow context:** add notes on the fellow's Context tab, or bulk-import them with `npm run import:context -- --granola notes.json --notion "Final Fellows….csv"` (keep these files out of git).
- **Comments:** `npm run import:comments -- YOUTUBE <datasetId>` for a one-off dataset, and `-- --reanalyze` after editing `src/lib/analysis/comments.ts`.
- **Re-tag after editing `src/lib/taxonomy.ts`:** `npm run analyze`.
- **Ground truth:** keep `data/ground-truth.md` curated; the accuracy check is only as good as that file.

## Known gaps (Sep 2026)

- **Apify limit:** the free plan hit its monthly limit during the first backfill. Michaël's @TheInsideView and Mikey Posada's channel don't reach the baseline window yet, and the dashboard flags this as a "partial baseline".
- **X:** limited to 10 tweets per run on the free plan, so Amina Green's X account isn't scraped yet.
- **No handles yet:** Jessica Riches, Petr Salaba, Suzy Shepherd, Sara Polyweb, Stuart Harmon, Strad Slater, Jeremy Ornstein and Taeyong Kim.
- **Comment tagging is keyword-based.** It's transparent but misses sarcasm, so treat rates as directional. An LLM pass is next.
- **Phase 2:** web and press mentions; LinkedIn career moves; a comparison group of non-fellow applicants.
