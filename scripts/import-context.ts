// Imports team context onto fellow pages (Context tab):
//   1. Meeting notes exported from Granola (JSON: [{fellow, date, title, url, body, kind?, done?}])
//   2. Team notes from the Notion "Final Fellows" export (support level, what they need, planned output…)
//
//   npm run import:context -- --granola <notes.json> --notion "<Final Fellows …_all.csv>"
//
// These files contain private meeting notes — keep them out of git. Re-running
// updates existing notes (matched by URL / by title for Notion notes).
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { ROSTER } from "../data/roster";

const db = new PrismaClient();
const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function fellowId(nameOrSlug: string) {
  const n = nameOrSlug.trim().toLowerCase();
  const seed = ROSTER.find((f) => f.slug === n || f.name.toLowerCase() === n || f.formNames?.some((x) => x.toLowerCase() === n) || f.name.toLowerCase().startsWith(n));
  if (!seed) return null;
  return (await db.fellow.findUnique({ where: { slug: seed.slug }, select: { id: true } }))?.id ?? null;
}

async function upsertNote(data: { fellowId: string; kind: string; title: string; body?: string | null; url?: string | null; date?: Date | null; source: string; pinned?: boolean; done?: boolean }) {
  const existing = await db.fellowNote.findFirst({
    where: data.url ? { fellowId: data.fellowId, url: data.url } : { fellowId: data.fellowId, source: data.source, title: data.title },
  });
  if (existing) await db.fellowNote.update({ where: { id: existing.id }, data });
  else await db.fellowNote.create({ data });
}

async function main() {
  const g = arg("granola");
  if (g) {
    const notes = JSON.parse(readFileSync(g, "utf8")) as { fellow: string; date: string; title: string; url: string; body: string | null; kind?: string; done?: boolean }[];
    let n = 0;
    for (const note of notes) {
      const id = await fellowId(note.fellow);
      if (!id) {
        console.warn(`  no fellow for ${note.fellow}`);
        continue;
      }
      await upsertNote({ fellowId: id, kind: note.kind ?? "meeting", title: note.title, body: note.body, url: note.url, date: new Date(note.date), source: "granola", done: note.done });
      n++;
    }
    console.log(`Granola: ${n} meeting notes`);
  }

  const csv = arg("notion");
  if (csv) {
    const rows = parse(readFileSync(csv, "utf8").replace(/^﻿/, ""), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    let n = 0;
    for (const r of rows) {
      const id = await fellowId(r["Name"] ?? "");
      if (!id) {
        console.warn(`  no fellow for ${r["Name"]}`);
        continue;
      }
      const clean = (s?: string) => {
        const t = (s ?? "").replace(/https:\/\/notes\.granola\.ai\/\S+/g, "").replace(/\s+\n/g, "\n").trim();
        return /[a-z0-9]/i.test(t) ? t : "";
      };
      const lines = [
        r["Track"] && `Track: ${r["Track"]} · ${r["Type"] ?? ""}`,
        r["With whom"] && `Partner org: ${r["With whom"]}`,
        r["Select 1"] && `Support level: ${r["Select 1"]}`,
        clean(r["Output "]) && `Planned output: ${clean(r["Output "])}`,
        clean(r["What they need / What they do"]) && `What they need / do: ${clean(r["What they need / What they do"])}`,
        clean(r["NOTES"]) && `Notes: ${clean(r["NOTES"])}`,
      ].filter(Boolean);
      await upsertNote({ fellowId: id, kind: "note", title: "Selection & onboarding summary (Notion)", body: lines.join("\n"), source: "notion", pinned: true });
      n++;
    }
    console.log(`Notion: ${n} summary notes`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
