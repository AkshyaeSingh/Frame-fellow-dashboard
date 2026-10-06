import type { PrismaClient } from "@prisma/client";

// Program events from the "Frame Fellows" Google Calendar become Resources
// (kind "event", tagged frame + mandatory/optional) so attendance can be
// ticked per fellow. Two inputs: a JSON export (Google Calendar API shape, as
// the Calendar connector returns it) or the calendar's secret iCal address
// (GCAL_ICS_URL), which the daily cron reads.

export type CalEvent = { id: string; title: string; start: Date; end: Date | null; allDay: boolean; location: string | null; description: string | null; url: string | null };

// Week markers, birthdays, deadlines, travel and office hours aren't events to attend.
const SKIP = /^(week \d+|.*birthday|.*deadline|travel to|.*office hours|frame fellowship ends|program showcase$)/i;

const CATEGORY: [RegExp, string[]][] = [
  [/mentor session|x frame|<>|masterclass|lightning talks|talk/i, ["mentor session", "talks"]],
  [/lock-?in/i, ["accountability", "lock-in"]],
  [/dinner|lunch|breakfast|picnic|hike|board games|screening|social|party|chill/i, ["social", "networking"]],
  [/retreat/i, ["retreat", "social"]],
  [/one on ones|1:1/i, ["1:1"]],
  [/orientation|reflection|showcase|farewell/i, ["program"]],
  [/summit|conference|eag/i, ["networking", "conference"]],
  [/funding|grants|funders/i, ["funding"]],
];

const clean = (t: string) => t.replace(/\[[^\]]*\]\s*:?\s*/g, "").replace(/\s+/g, " ").trim();

const words = (t: string) => new Set(clean(t).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !["frame", "fellowship", "mandatory", "session"].includes(w)));
const pacificDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

// Drop all-day "banner" entries that duplicate a timed event the same day (e.g. a
// mentor session listed both ways), and exact repeats.
function dedupe(events: CalEvent[]) {
  const timed = events.filter((e) => !e.allDay);
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${pacificDay(e.start)}|${clean(e.title).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (!e.allDay) return true;
    const w = words(e.title);
    return !timed.some((t) => pacificDay(t.start) === pacificDay(e.start) && [...words(t.title)].filter((x) => w.has(x)).length >= Math.min(2, w.size));
  });
}

export async function upsertProgramEvents(db: PrismaClient, all: CalEvent[]) {
  let kept = 0;
  const keep: string[] = [];
  const events = dedupe(all.filter((e) => e.title && !SKIP.test(e.title.trim())));
  for (const e of events) {
    keep.push(`gcal:${e.id}`);
    const mandatory = /mandatory/i.test(e.title);
    const tags = [...new Set(["frame", "program", mandatory ? "mandatory" : "optional", ...CATEGORY.filter(([re]) => re.test(e.title)).flatMap(([, t]) => t)])];
    const data = {
      kind: "event",
      title: clean(e.title) || e.title,
      url: e.url,
      date: e.start,
      endDate: e.end,
      location: e.location?.startsWith("http") ? null : e.location,
      description: [mandatory ? "Mandatory program event." : "Optional program event.", e.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 240)].filter(Boolean).join(" "),
      tags,
      source: "gcal",
    };
    await db.resource.upsert({ where: { externalId: `gcal:${e.id}` }, create: { externalId: `gcal:${e.id}`, ...data }, update: data });
    kept++;
  }
  // Remove calendar events that were deleted or are now filtered, within the range we just read.
  if (all.length) {
    const times = all.map((e) => e.start.getTime());
    const removed = await db.resource.deleteMany({
      where: { source: "gcal", externalId: { notIn: keep }, date: { gte: new Date(Math.min(...times)), lte: new Date(Math.max(...times)) } },
    });
    return { events: kept, removed: removed.count };
  }
  return { events: kept, removed: 0 };
}

type GEvent = { id: string; summary?: string; status?: string; location?: string; description?: string; htmlLink?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };

// All-day dates come as "2026-09-10" (API) or "2026-09-10T00:00:00Z" (connector); pin them to midday UTC.
const allDay = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`);

export function fromGoogleJson(items: GEvent[]): CalEvent[] {
  return items
    .filter((e) => e.status !== "cancelled" && e.start)
    .map((e) => ({
      id: e.id,
      title: e.summary ?? "",
      start: e.start!.dateTime ? new Date(e.start!.dateTime) : allDay(e.start!.date!),
      end: e.end ? (e.end.dateTime ? new Date(e.end.dateTime) : allDay(e.end.date!)) : null,
      allDay: !e.start!.dateTime,
      location: e.location ?? null,
      description: e.description ?? null,
      url: e.location?.startsWith("http") ? e.location : null,
    }));
}

// Minimal iCalendar (RFC 5545) reader: VEVENTs with UID, SUMMARY, DTSTART/DTEND,
// LOCATION, DESCRIPTION. Floating/TZID times are read as Pacific (the calendar's zone).
export function fromIcs(text: string): CalEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const out: CalEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const start = parseIcsDate(cur.DTSTART);
      if (cur.UID && start && cur.STATUS?.value !== "CANCELLED")
        out.push({
          id: cur.UID.value.replace(/@google\.com$/, ""),
          title: unescape(cur.SUMMARY?.value ?? ""),
          start,
          end: parseIcsDate(cur.DTEND),
          allDay: /VALUE=DATE(?!-)/.test(cur.DTSTART!.params),
          location: cur.LOCATION ? unescape(cur.LOCATION.value) : null,
          description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION.value) : null,
          url: null,
        });
      cur = null;
    } else if (cur) {
      const m = line.match(/^([A-Z-]+)((?:;[^:]*)?):(.*)$/);
      if (m) cur[m[1]!] = { params: m[2]!, value: m[3]! };
    }
  }
  return out;
}

const unescape = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

function parseIcsDate(f?: { value: string; params: string }) {
  if (!f) return null;
  const m = f.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "12", mi = "00", s = "00", z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  if (z) return new Date(`${iso}Z`);
  // Pacific: UTC-7 in daylight time (Mar–Nov), UTC-8 otherwise. Close enough for event dates.
  const month = Number(mo);
  return new Date(`${iso}${month > 3 && month < 11 ? "-07:00" : "-08:00"}`);
}
