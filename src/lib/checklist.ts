// The fellowship progress checklist: Monday/ClickUp-style statuses, a default
// set of items per fellow (keyed so they line up on the progress board), and
// the colour each status gets on the progress ring.

export const STATUSES = [
  { key: "done", label: "Done", color: "var(--status-done)", text: "text-white" },
  { key: "on-track", label: "On track", color: "var(--status-good)", text: "text-white" },
  { key: "working", label: "Working on it", color: "var(--status-working)", text: "text-white" },
  { key: "at-risk", label: "At risk", color: "var(--status-risk)", text: "text-black" },
  { key: "stuck", label: "Stuck", color: "var(--status-stuck)", text: "text-white" },
  { key: "not-started", label: "Not started", color: "var(--status-none)", text: "text-muted-foreground" },
] as const;
export type StatusKey = (typeof STATUSES)[number]["key"];
export const statusOf = (k: string) => STATUSES.find((s) => s.key === k) ?? STATUSES[STATUSES.length - 1]!;

// How far along an item is, for the ring and "% complete".
export const STATUS_SCORE: Record<string, number> = { done: 1, "on-track": 0.75, working: 0.5, "at-risk": 0.35, stuck: 0.15, "not-started": 0 };

export type DefaultItem = { key: string; title: string; area: string; amplifierOnly?: boolean; auto?: "cadence" };

export const DEFAULT_ITEMS: DefaultItem[] = [
  { key: "amplifier-comms", title: "Communicating well with {org}", area: "amplifier", amplifierOnly: true },
  { key: "amplifier-delivery", title: "Delivering work {org} values", area: "amplifier", amplifierOnly: true },
  { key: "cadence", title: "Hitting their content cadence", area: "content", auto: "cadence" },
  { key: "connecting", title: "Connecting with other fellows", area: "community" },
  { key: "toc", title: "Theory of change doc (week 8)", area: "program" },
  { key: "portfolio", title: "Funder-ready portfolio (week 9)", area: "program" },
  { key: "prospects", title: "Clear path after the fellowship", area: "career" },
];

// Columns on the progress board, in order.
export const BOARD_COLUMNS = DEFAULT_ITEMS.map((d) => ({ key: d.key, label: d.title.replace(" with {org}", " w/ org").replace(" {org} values", " for org").replace("Hitting their content cadence", "Content cadence").replace(/ \(week \d\)/, ""), auto: d.auto, amplifierOnly: d.amplifierOnly }));

export const isAmplifier = (track: string | null | undefined) => /amplifier/i.test(track ?? "");

export function defaultItemsFor(f: { track: string | null; partnerOrg: string | null }) {
  const org = f.partnerOrg?.replace(/\s*\(.*\)\s*$/, "").replace(/-.*$/, "").trim() || "their org";
  return DEFAULT_ITEMS.filter((d) => !d.amplifierOnly || isAmplifier(f.track)).map((d, i) => ({ ...d, title: d.title.replace("{org}", org), order: i }));
}

// The cadence item follows the cadence plan automatically.
export function cadenceStatus(health: string): StatusKey {
  return health === "on-track" ? "on-track" : health === "done" ? "done" : health === "behind" ? "at-risk" : health === "off-track" ? "stuck" : "not-started";
}
