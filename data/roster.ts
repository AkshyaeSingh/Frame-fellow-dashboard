// Source of truth for who we track and where. Edit this (or the admin page)
// when handles change. Handles were resolved from the Notion fellow databases,
// onboarding/exit forms, and by scraping the post links fellows shared.
//
// Fellowship windows drive every before/during/after comparison.

export type AccountSeed = {
  platform: "YOUTUBE" | "TIKTOK" | "INSTAGRAM" | "X" | "LINKEDIN" | "SUBSTACK" | "PODCAST" | "OTHER";
  handle: string;
  url?: string;
  primary?: boolean;
  note?: string;
};

export type FellowSeed = {
  name: string;
  slug: string;
  cohort: "cohort-1" | "cohort-2";
  track?: string;
  format?: string;
  hometown?: string;
  partnerOrg?: string;
  status?: string;
  email?: string; // optional: match forms by email (keep out of git — names are used by default)
  formNames?: string[]; // alternative spellings used in forms
  plannedOutput?: string;
  accounts: AccountSeed[];
};

export const COHORTS = [
  { slug: "cohort-1", name: "Cohort 1 (SF, Jan–Mar 2026)", startDate: "2026-01-26", endDate: "2026-03-21" },
  { slug: "cohort-2", name: "Cohort 2 (SF, Sep–Nov 2026)", startDate: "2026-09-07", endDate: "2026-11-13" },
] as const;

const yt = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "YOUTUBE", handle: `@${h}`, url: `https://www.youtube.com/@${h}`, ...extra });
const tt = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "TIKTOK", handle: `@${h}`, url: `https://www.tiktok.com/@${h}`, ...extra });
const ig = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "INSTAGRAM", handle: `@${h}`, url: `https://www.instagram.com/${h}/`, ...extra });
const x = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "X", handle: `@${h}`, url: `https://x.com/${h}`, ...extra });
const li = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "LINKEDIN", handle: h, url: `https://www.linkedin.com/in/${h}/`, ...extra });
const ss = (h: string, extra: Partial<AccountSeed> = {}): AccountSeed => ({ platform: "SUBSTACK", handle: h, url: `https://${h}.substack.com`, ...extra });

export const ROSTER: FellowSeed[] = [
  // ---------------- Cohort 1 ----------------
  { name: "Michaël Trazzi", slug: "michael-trazzi", cohort: "cohort-1", track: "Resident", format: "Long form", hometown: "San Francisco, USA", formNames: ["Michael Trazzi"],
    accounts: [yt("TheInsideView", { primary: true }), yt("StopTheAIRace", { note: "Stop the AI Race protest channel" }), tt("theinsideview.ai"), x("MichaelTrazzi")] },
  { name: "Veronica Hylak", slug: "veronica-hylak", cohort: "cohort-1", track: "Resident", format: "Long form", hometown: "Washington DC, USA", formNames: ["Veronica Hyla"],
    accounts: [yt("HeyAITech", { primary: true })] },
  { name: "Inken Paland", slug: "inken-paland", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "Berlin, Germany",
    accounts: [ig("askinkenai", { primary: true }), li("inken-paland"), ss("inken")] },
  { name: "Gaetan Selle", slug: "gaetan-selle", cohort: "cohort-1", track: "Resident", format: "Long form", hometown: "Sydney, Australia",
    accounts: [yt("the-flares", { primary: true, note: "The Flares (French)" })] },
  { name: "Mikey Posada", slug: "mikey-posada", cohort: "cohort-1", track: "Resident", format: "Long form", hometown: "Vancouver, Canada",
    accounts: [yt("mikeyposada", { primary: true })] },
  { name: "Caitlin Yardley", slug: "caitlin-yardley", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "London, UK",
    accounts: [ig("futurebriefing", { primary: true })] },
  { name: "Mateus de Sousa Shields", slug: "mateus-de-sousa", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "London, UK", formNames: ["mateus de sousa", "mateus", "Mateus De Sousa Shields"],
    accounts: [ig("futuretense.tv", { primary: true })] },
  { name: "Vin Sixsmith", slug: "vin-sixsmith", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "Amsterdam, Netherlands",
    accounts: [yt("VSixsmith", { primary: true }), tt("vinsixsmith"), tt("aiamworried", { note: "AI I'm Worried clips page" }), ig("aimworried", { note: "AI I'm Worried clips page" })] },
  { name: "Lauren Goldgrub", slug: "lauren-goldgrub", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "London, UK",
    accounts: [tt("laurens.little.library", { primary: true })] },
  { name: "Janet Oganah", slug: "janet-oganah", cohort: "cohort-1", track: "Resident", format: "Short form", hometown: "London, UK",
    accounts: [tt("jatgpt_", { primary: true })] },
  { name: "Jessica Riches", slug: "jessica-riches", cohort: "cohort-1", track: "Resident", format: "Short film", hometown: "London, UK", accounts: [] },
  { name: "Petr Salaba", slug: "petr-salaba", cohort: "cohort-1", track: "Visiting", format: "Short film", hometown: "Prague, Czech Republic", accounts: [] },
  { name: "Suzy Shepherd", slug: "suzy-shepherd", cohort: "cohort-1", track: "Visiting", format: "Short film", accounts: [] },

  // ---------------- Cohort 2 ----------------
  { name: "Ernestine Siu", slug: "ernestine-siu", cohort: "cohort-2", track: "Amplifier", format: "Short form", partnerOrg: "Andon Labs", plannedOutput: "Own content with accountability",
    accounts: [ig("heyernestine", { primary: true }), yt("ErnestineSiu")] },
  { name: "Reaa Puri", slug: "reaa-puri", cohort: "cohort-2", track: "Amplifier", format: "Short form", partnerOrg: "Humans in Control",
    accounts: [ig("reaapuri", { primary: true }), tt("reaapuri"), tt("arcsofconnection", { note: "Test account" })] },
  { name: "Lauren Mushro", slug: "lauren-mushro", cohort: "cohort-2", track: "Amplifier", format: "Short form", partnerOrg: "Apart Research",
    accounts: [ig("anatomyofai", { primary: true })] },
  { name: "Amina Green", slug: "amina-green", cohort: "cohort-2", track: "Amplifier", format: "Short form", partnerOrg: "MATS",
    accounts: [x("Amina_io", { primary: true })] }, // also MATS Amplifier
  { name: "Sara Polyweb", slug: "sara-polyweb", cohort: "cohort-2", track: "Amplifier", format: "Short form", partnerOrg: "CASE",
    accounts: [ig("sarainwondertech", { primary: true }), ss("sarainwondertech")] },
  { name: "Stuart Harmon", slug: "stuart-harmon", cohort: "cohort-2", track: "Amplifier", format: "Long form", partnerOrg: "The Midas Project (pending)", plannedOutput: "1 video on AI education", accounts: [] }, // no channel of his own
  { name: "Martin Lee", slug: "martin-lee", cohort: "cohort-2", track: "Independent", format: "Long form", formNames: ["Martin Lee (Seungmin Lee)"], plannedOutput: "10 Humans vs AI series: trailers, episodes, 30 short clips",
    accounts: [ig("mwtle", { primary: true }), ig("10humansvsai", { note: "10 Humans vs AI series" }), yt("mrwtle"), li("mrtle")] },
  { name: "Aaron Nev McLachlan", slug: "aaron-nev", cohort: "cohort-2", track: "Independent", format: "Long form", formNames: ["Aaron Nev McLachlan", "Aaron Nev"], plannedOutput: "4–6 long-form videos",
    accounts: [yt("nevscape", { primary: true })] }, // @struthiverse is the old studio page, not tracked
  { name: "Reuben Adams", slug: "reuben-adams", cohort: "cohort-2", track: "Independent", format: "Long form", plannedOutput: "6 long episodes",
    accounts: [yt("ReubenJAdams", { primary: true })] },
  { name: "Jeroen Willems", slug: "jeroen-willems", cohort: "cohort-2", track: "Independent", format: "Short form", plannedOutput: "3 long-form, 20 short-form",
    accounts: [yt("ahappierworldyt", { primary: true }), ig("ahappierworldyt"), tt("ahappierworldyt")] },
  { name: "William Lee", slug: "william-lee", cohort: "cohort-2", track: "Independent", format: "Long form", plannedOutput: "6 investigatory long videos",
    accounts: [yt("un.william", { primary: true, note: "Korean-language channel (confirmed his)" })] },
  { name: "Strad Slater", slug: "strad-slater", cohort: "cohort-2", track: "Independent", format: "Long form", plannedOutput: "20 explanatory videos",
    accounts: [yt("stradslater", { primary: true })] },
  { name: "Jeremy Ornstein", slug: "jeremy-ornstein", cohort: "cohort-2", track: "Independent", format: "Short form", plannedOutput: "80 short interviews (The Human Intelligence Show)",
    accounts: [ig("humanintelligenceshow", { primary: true, note: "Human Intelligence Show" }), tt("jeremy_o123"), ig("jer1300", { note: "Personal" })] },
  { name: "Taeyong Kim", slug: "taeyong-kim", cohort: "cohort-2", track: "Independent", format: "Long form", plannedOutput: "8 interviews with AI safety people",
    accounts: [yt("eoglobal", { primary: true, note: "EO, his company channel (most videos are not fellowship output)" })] },
];

// Finished Apify runs to import (npm run import:apify). New runs are appended
// automatically by scripts/scrape.ts.
export const APIFY_DATASETS: { platform: AccountSeed["platform"]; datasetId: string; kind?: "posts" | "profiles"; note?: string }[] = [
  { platform: "YOUTUBE", datasetId: "gDdfieBhRRBpmkhP8", note: "Initial backfill since 2025-07 (with subtitles; stopped at Apify plan limit)" },
  { platform: "INSTAGRAM", datasetId: "Rxc48cMLY8RtHgmI6", note: "Initial backfill since 2025-07" },
  { platform: "INSTAGRAM", datasetId: "b3fXdzbyt4ss2gRtv", kind: "profiles", note: "Profile details" },
  { platform: "TIKTOK", datasetId: "eWhble5fJYVLrzhtc", note: "Initial backfill since 2025-07 (with subtitles)" },
  { platform: "X", datasetId: "ahAXpESvqCIguBguC", note: "Free-plan sample (10 tweets)" },
  { platform: "LINKEDIN", datasetId: "7PKG7H22Qm4aAn0q0", note: "Inken + Martin since 2025-07" },
  { platform: "LINKEDIN", datasetId: "ZxMO9WQoBzVXmzKVU", note: "Inken deep backfill since 2025-10" },
  { platform: "TIKTOK", datasetId: "bxGJBa0T8qDk7lk4j", note: "Janet deep backfill since 2025-10" },
  { platform: "TIKTOK", datasetId: "uzu1mg24wILsEfIqP", note: "Retry: theinsideview.ai, struthiverse, aiamworried (only struthiverse found)" },
  { platform: "INSTAGRAM", datasetId: "et8vTdsGWeJI1lQAn", note: "Inken deep backfill since 2025-10 (stopped at Apify plan limit)" },
];
