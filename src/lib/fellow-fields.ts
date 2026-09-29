// Editable fellow fields: one definition drives the Fellows database, the
// profile form and the edit permissions.
//   fellow: true  → the fellow can see and edit it on their own dashboard
//   team: true    → team-only (never shown to the fellow or funders)

export type FieldDef = {
  label: string;
  type: "text" | "long" | "tags" | "number" | "select";
  fellow?: boolean;
  team?: boolean;
  int?: boolean;
  options?: [string, string][];
  nullable?: boolean;
  placeholder?: string;
  help?: string;
};

export const HEALTH_OPTIONS: [string, string][] = [
  ["on-track", "On track"],
  ["behind", "Behind"],
  ["needs-help", "Needs help"],
  ["paused", "Paused"],
];

export const FIELDS = {
  about: { label: "About", type: "long", fellow: true, placeholder: "Who you are and what you're making, in a few lines" },
  interests: { label: "Interests", type: "tags", fellow: true, placeholder: "Comma-separated: interpretability, documentary, policy…", help: "Topics, formats and communities. Used to recommend events and resources." },
  programGoals: { label: "Fellowship goals", type: "long", fellow: true, placeholder: "What would make these 10 weeks a success?" },
  fellowNotes: { label: "Anything else we should know", type: "long", fellow: true },
  longPerWeek: { label: "Long-form / week", type: "number", fellow: true, help: "YouTube videos ≥3 min, podcasts" },
  shortPerWeek: { label: "Short-form / week", type: "number", fellow: true, help: "Shorts, TikToks, Reels, carousels" },
  programLong: { label: "Long-form (program total)", type: "number", int: true, fellow: true },
  programShort: { label: "Short-form (program total)", type: "number", int: true, fellow: true },
  cadenceNote: { label: "Cadence notes", type: "long", fellow: true },
  cadenceScope: { label: "Counts toward cadence", type: "select", options: [["all", "All posts"], ["ai-safety", "AI-safety posts only"]], nullable: false },
  partnerOrg: { label: "Partner org", type: "text" },
  track: { label: "Track", type: "text" },
  format: { label: "Format", type: "text" },
  health: { label: "Status", type: "select", team: true, options: HEALTH_OPTIONS, help: "Leave blank to use the cadence-based status" },
  nextStep: { label: "Next step", type: "long", team: true },
  needs: { label: "What they need from us", type: "long", team: true },
  pointOfContact: { label: "Point of contact", type: "text", team: true },
  buddy: { label: "Accountability buddy", type: "text", team: true },
  slackUserId: { label: "Slack user ID", type: "text", team: true, placeholder: "U0123ABCD", help: "Links their Slack messages to this profile" },
} satisfies Record<string, FieldDef>;

export type FieldKey = keyof typeof FIELDS;
export const FIELD_DEFS: Record<FieldKey, FieldDef> = FIELDS;
