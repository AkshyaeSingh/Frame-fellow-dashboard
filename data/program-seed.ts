// Starting values for cohort 2 program management, taken from 1:1 notes
// (Granola, Sep 2026). Only fills empty fields, so edits in the app win.
// Cadence: per-week targets by format, plus program totals.

type Plan = {
  longPerWeek?: number;
  shortPerWeek?: number;
  programLong?: number;
  programShort?: number;
  cadenceNote?: string;
  interests?: string[];
};

const CONFIRM = "From 1:1 notes; please confirm.";

export const PLANS: Record<string, Plan> = {
  "aaron-nev": { longPerWeek: 0.5, programLong: 5, cadenceNote: `4–6 long-form videos. ${CONFIRM}`, interests: ["gradual disempowerment", "hopeful framing", "crypto & tech developers", "long-form", "field building"] },
  "amina-green": { cadenceNote: `MATS: grow X to 10K; own content on X. Targets not set yet.`, interests: ["emotional atrophy & chatbots", "kids-chatbots", "big-picture ai", "x/twitter", "mats", "growth"] },
  "ernestine-siu": { shortPerWeek: 1, programShort: 10, programLong: 1, cadenceNote: `1 AI safety short/week on her IG + 1 YouTube video on the Andon business experiment. ${CONFIRM}`, interests: ["news explainers", "ai safety for newcomers", "andon", "short-form", "business experiments"] },
  "jeremy-ornstein": { shortPerWeek: 8, programShort: 80, cadenceNote: `80 short interviews (Human Intelligence Show). ${CONFIRM}`, interests: ["street interviews", "activism", "grassroots politics", "humor", "short-form"] },
  "jeroen-willems": { longPerWeek: 0.5, shortPerWeek: 2, programLong: 4, programShort: 20, cadenceNote: `3–4 long-form + 15–20 shorts; one long-form every 2 weeks. ${CONFIRM}`, interests: ["x-risk", "misuse", "storytelling", "documentary", "long-form", "editing", "europe"] },
  "lauren-mushro": { shortPerWeek: 2.5, programShort: 25, programLong: 1, cadenceNote: `Personal 2–3 shorts/week; Apart ≥2 posts/week; one long-form script. ${CONFIRM}`, interests: ["ai ethics", "research-explainers", "apart", "substack", "linkedin", "paid ads", "research lab"] },
  "martin-lee": { programLong: 3, programShort: 30, cadenceNote: `2.5 episodes edited + 3 trailers + ~30 clips. ${CONFIRM}`, interests: ["reality show", "gen z", "long-form", "clipping", "distribution"] },
  "reaa-puri": { cadenceNote: "HIC: 8-week social strategy + campaign content; goal is attributable sign-ups. Targets not set yet.", interests: ["humans-in-control", "campaigns", "persuasion testing", "documentary", "humor", "activism"] },
  "reuben-adams": { longPerWeek: 0.6, programLong: 6, cadenceNote: `6 long episodes (~1 per 2 weeks). ${CONFIRM}`, interests: ["research-explainers", "misalignment", "calm explainers", "long-form", "editing", "animation"] },
  "sara-polyweb": { cadenceNote: "CASE social strategy + own IG. Targets not set yet.", interests: ["governance-policy", "surveillance & privacy", "researcher podcasts", "growth", "linkedin", "case"] },
  "strad-slater": { longPerWeek: 2, programLong: 20, cadenceNote: `1 broad + 1–2 deep dives per week (20 explanatory videos). ${CONFIRM}`, interests: ["interpretability", "research-explainers", "model psychology", "long-form", "packaging & growth"] },
  "stuart-harmon": { programLong: 1, cadenceNote: "1 video (no channel of his own).", interests: ["lab-accountability", "surveillance & policing", "investigative", "documentary", "grassroots orgs"] },
  "taeyong-kim": { longPerWeek: 0.8, programLong: 8, cadenceNote: `8 interviews with AI safety people. ${CONFIRM}`, interests: ["physical ai & robotics", "media business models", "founder interviews", "long-form", "korea"] },
  "william-lee": { longPerWeek: 0.5, programLong: 4, cadenceNote: "Deciding: 3–4 long-form OR 20–30 Shorts + 2 long-form. Team target 4–6 videos minimum.", interests: ["info-integrity", "ai misuse & fraud", "investigative", "documentary", "long-form", "korea"] },
};

// Events, resources and people mentioned in Sep 2026 meetings.
export type ResourceSeed = { key: string; kind: string; title: string; url?: string; date?: string; endDate?: string; location?: string; description?: string; tags: string[] };

export const RESOURCES: ResourceSeed[] = [
  { key: "frame-showcase-2026", kind: "event", title: "Frame Program Showcase (funder day)", date: "2026-11-05", location: "Lighthaven, Berkeley", description: "Full-day showcase with ~6–7 funders flown in. Pitch your theory of change and sustainable content model.", tags: ["funding", "frame", "grant", "theory of change"] },
  { key: "frame-fellows-funders-2026", kind: "event", title: "Fellows & funders evening", date: "2026-11-04", location: "SF", tags: ["funding", "frame", "networking"] },
  { key: "creator-finance-session", kind: "event", title: "Creator finance session: Austin (Manifund) + Maggie (FLI)", date: "2026-10-29", location: "Frame office", description: "Funding and sustainability as a creator. Tentative date.", tags: ["funding", "grant", "sustainability", "fli"] },
  { key: "david-shore-session", kind: "event", title: "David Shore: dinner + talk", date: "2026-10-08", location: "Frame office", description: "6:00 PM dinner with fellows, 7:15 PM talk.", tags: ["political", "governance-policy", "persuasion testing", "polling"] },
  { key: "eo-new-media-summit", kind: "event", title: "Taeyong's New Media Summit (EO)", date: "2026-10-08", location: "SF", description: "Creator/media conference hosted by EO during a16z Speedrun.", tags: ["media business models", "growth", "networking", "founder interviews"] },
  { key: "frame-bowling", kind: "event", title: "Frame bowling / rock climbing social", date: "2026-10-02", location: "SF", tags: ["social", "frame"] },
  { key: "postathon", kind: "event", title: "Thursday post-a-thon (lock-in)", location: "Frame office", description: "Brunch at 11, lock-in from 12, four focused bouts, social at the end. Optional.", tags: ["accountability", "short-form", "long-form", "frame"] },
  { key: "feedback-tuesdays", kind: "event", title: "Weekly content feedback session (Tuesdays)", location: "Frame office", tags: ["feedback", "scripting", "frame"] },
  { key: "hic-reno", kind: "event", title: "Humans in Control: Reno protest + teach-in", date: "2026-10-03", endDate: "2026-10-04", location: "Reno, NV", tags: ["humans-in-control", "activism", "protest-event", "documentary"] },
  { key: "hic-teach-in", kind: "event", title: "AI Reality Check nationwide teach-in", date: "2026-11-14", tags: ["humans-in-control", "activism", "campaigns"] },
  { key: "takeoff-dc", kind: "event", title: "Takeoff Conference", date: "2026-11-13", endDate: "2026-11-15", location: "Washington, DC", description: "Travel/registration support may be available; ask Akshyae for an intro.", tags: ["governance-policy", "political", "networking"] },
  { key: "eag-ny", kind: "event", title: "EAG New York", location: "New York", tags: ["networking", "careers-field", "funding"] },
  { key: "nyaigs", kind: "event", title: "NYC AI Governance & Safety events (Patricia Paskoff)", location: "New York", tags: ["governance-policy", "evals-demos", "networking"] },
  { key: "constellation-luma", kind: "resource", title: "Constellation & Lighthaven Luma calendars", url: "https://lu.ma", description: "Follow these to find Berkeley AI safety events and meet researchers.", tags: ["networking", "researchers", "research-explainers", "community"] },
  { key: "bytjobs", kind: "resource", title: "bytjobs.co: free editor job listings", url: "https://bytjobs.co", description: "Strong pool of editors at competitive rates.", tags: ["editing", "long-form", "hiring"] },
  { key: "good-impressions", kind: "person", title: "Good Impressions (Tom): paid ads for AI safety orgs", url: "https://goodimpressions.com", description: "Runs marketing for EA and AI safety orgs; LinkedIn ads experience.", tags: ["paid ads", "growth", "linkedin", "partnership"] },
  { key: "leo-gao-grants", kind: "funding", title: "Leo Gao rapid grants ($10–20K)", description: "Fast turnaround small grants.", tags: ["funding", "grant"] },
  { key: "fli-accelerator", kind: "funding", title: "FLI digital media accelerator (Maggie)", tags: ["funding", "grant", "fli"] },
  { key: "manifund", kind: "funding", title: "Manifund (Austin)", url: "https://manifund.org", tags: ["funding", "grant"] },
  { key: "humanity-ai-fund", kind: "funding", title: "Humanity AI fund", tags: ["funding", "grant", "research lab"] },
  { key: "drew-spartz", kind: "person", title: "Drew Spartz: YouTube growth & editor network", description: "Content strategy 'machine'; world-class editor connections.", tags: ["growth", "editing", "long-form", "packaging & growth"] },
  { key: "peter-lebedev", kind: "person", title: "Peter Lebedev: ex-Veritasium, scaled to 90K in 5 months", description: "Communicator-in-residence model (Palisade).", tags: ["growth", "long-form", "scripting", "research-explainers"] },
  { key: "veronica-hylak", kind: "person", title: "Veronica Hylak (cohort 1): cheap editors, broke a YouTube plateau", tags: ["editing", "growth", "long-form"] },
  { key: "eo-editing-team", kind: "resource", title: "EO's editing team (Vietnam) for post-production", description: "Taeyong offered his 10-person team to help fellows.", tags: ["editing", "long-form", "short-form"] },
  { key: "anthropic-misuse", kind: "resource", title: "Anthropic threat intelligence / misuse reports", url: "https://www.anthropic.com/news", description: "Monthly case studies of AI misuse. Good story sources.", tags: ["info-integrity", "ai misuse & fraud", "investigative", "lab-accountability"] },
  { key: "metricool", kind: "resource", title: "Metricool (analytics dashboard)", url: "https://metricool.com", tags: ["growth", "analytics", "linkedin"] },
];
