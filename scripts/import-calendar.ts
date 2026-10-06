// Imports Frame Fellows calendar events as program events (Resources).
//   npm run import:calendar -- --json <events.json>   # Google Calendar API / connector export
//   npm run import:calendar -- --ics <secret iCal URL>
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { fromGoogleJson, fromIcs, upsertProgramEvents } from "../src/lib/ingest/calendar";

const db = new PrismaClient();
const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const json = arg("json");
  const ics = arg("ics") ?? process.env.GCAL_ICS_URL;
  const events = json ? fromGoogleJson(JSON.parse(readFileSync(json, "utf8")).events) : ics ? fromIcs(await (await fetch(ics)).text()) : [];
  if (!events.length) throw new Error("Pass --json <file> or --ics <url> (or set GCAL_ICS_URL)");
  console.log(await upsertProgramEvents(db, events));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
