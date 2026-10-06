# Frame · Fellow Impact

Internal dashboard for tracking everything Frame fellows publish, across platforms and cohorts, and for showing funders what changed because of the fellowship. **Private:** team and funders only, and every page sits behind a password.

## What it does

Three views, each built around one question.

**Team: "Who needs us this week?"**
| Page | What's there |
|---|---|
| **Home** `/` | Three views. **Community:** every fellow in a ring, each avatar wrapped in its coloured checklist (heavy outer band = amplifier org, thin = independent). **Progress board:** Monday-style grid of checklist statuses per fellow, plus how we feel and how we can support. **Details:** the editable fellows table. Above them, the cohort at a glance (on track, this week vs plan, posts, AI-safety views, audience moved). **Needs attention:** fellows off track, marked needs-help or with a Slack concern, plus a one-line "also worth a look" (quiet, no 1:1 in 3+ weeks, stale actions). Then the editable fellows table (Simple / All columns / Custom). |
| **Fellow** `/fellows/[slug]` | **Overview:** the fellow card (progress ring, org and location, 1:1s, events attended, how we feel) and the **fellowship progress checklist** (colour statuses: done, on track, working on it, at risk, stuck, not started; defaults per track plus custom items), then latest 1:1, a timeline, cadence and analytics, and a sidebar with how we can support, after the fellowship, events (tick who came), Seen on Slack, profile, plan and accounts. Impact detail is folded underneath. **Content:** posts, audience response, messaging & CTAs. **Notes:** meetings (Granola), decisions, action items, Slack, plus forms and Trudy. **Opportunities:** recommended events and resources. |
| **Content** `/content` | Every post as a grid or table, with filters (cohort, fellow, platform, topic, CTA, org, AI safety, **outliers ≥2/3/5× usual**). Picking a cohort shows per-fellow totals (the content board). |
| **Impact** `/impact` | Before/during/after across the portfolio, weekly output, exit survey. Also the funders' landing page. |
| **More** | Resources (events, people, funding), Data & scraping, Methodology. |

**Fellows: "Am I on track, and what's next?"** **My week** `/me` shows this week and the fellowship so far vs their plan, next steps from Frame (notes marked Shared), three recommendations, their latest posts, best performer and audience quotes. Profile, plan, accounts and password sit under *Your info*. **Cohort** `/cohort` is the content board for their cohort.

**Funders:** Impact, Content and Methodology, plus each fellow's Overview, Content and Self-reports. No team notes, Slack or Granola.

**Sign-in:** one form, username + password.
- `admin` + `TEAM_PASSWORD`: full access and editing.
- `funder` + `FUNDER_PASSWORD`: read-only; private form answers and team notes hidden.
- **Fellows:** their lowercase first name, plus a password the team creates on the Fellows page (*Fellow sign-in* column → Create/Reset password). Only a hash is stored. Fellows can change it on their Plan & cadence tab. They see their own dashboard (Impact, Plan & cadence, Content, Audience, Opportunities) and can edit their profile, interests, goals, cadence plan and handles; every change is logged. They can also see cohort-mates' content and the content board, but never team notes, Granola, Slack, forms, Trudy or other fellows' status. A personal sign-in link is also available, and *Sign out all* invalidates sessions and links.

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
- **Slack (daily, `/api/cron/slack-sync`):** create a Slack app with bot scopes `channels:history`, `channels:read`, `groups:history`, `groups:read`, `users:read`, install it to the workspace, set `SLACK_BOT_TOKEN`, then `/invite` the bot to the channels to include. It never reads DMs. Fellows are linked by exact name match or by the Slack user ID on the Fellows page. Messages are tagged (concern, win, event, ask, feedback) and show on the team-only Context tab. Concerns also appear in the weekly digest. Tell fellows which channels are included.
- **Program events (daily, `/api/cron/calendar-sync`):** set `GCAL_ICS_URL` to the Frame Fellows calendar's *secret address in iCal format* (Google Calendar → calendar settings → Integrate calendar). Week markers, birthdays and deadlines are skipped; "[Mandatory]" in the title marks mandatory events. One-off import: `npm run import:calendar -- --json <export>` or `-- --ics <url>`.
- **Events (weekly):** the Luma scraper searches AI-safety terms in SF and keeps only relevant events. Add trusted org calendars to `LUMA_CALENDARS` to include all of their events.
- **Cadence:** targets start from the 1:1 notes (`npm run seed:program`, fills only empty fields). Edit them on the Fellows page or the Plan tab. For fellows tracked on a company channel (Taeyong / EO), set *Counts toward cadence* to AI-safety posts only.
- **Fellow context:** add notes on the fellow's Context tab, or bulk-import them with `npm run import:context -- --granola notes.json --notion "Final Fellows….csv"` (keep these files out of git).
- **Comments:** `npm run import:comments -- YOUTUBE <datasetId>` for a one-off dataset, and `-- --reanalyze` after editing `src/lib/analysis/comments.ts`.
- **Re-tag after editing `src/lib/taxonomy.ts`:** `npm run analyze`.
- **Ground truth:** keep `data/ground-truth.md` curated; the accuracy check is only as good as that file.

## Known gaps (Sep 2026)

- **Apify limit:** the free plan hit its monthly limit during the first backfill. Michaël's @TheInsideView and Mikey Posada's channel don't reach the baseline window yet, and the dashboard flags this as a "partial baseline".
- **X:** limited to 10 tweets per run on the free plan, so Amina Green's X account isn't scraped yet.
- **No handles yet:** Jessica Riches, Petr Salaba, Suzy Shepherd (cohort 1). Stuart Harmon has no channel of his own.
- **Granola** has no server API we can call from Vercel. Notes come in through the Granola connector in a Claude session, or from pasted links on the Context tab.
- **Comment tagging is keyword-based.** It's transparent but misses sarcasm, so treat rates as directional. An LLM pass is next.
- **Phase 2:** web and press mentions; LinkedIn career moves; a comparison group of non-fellow applicants.
