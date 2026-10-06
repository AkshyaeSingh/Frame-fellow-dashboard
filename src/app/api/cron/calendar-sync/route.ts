import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { db } from "@/lib/db";
import { fromIcs, upsertProgramEvents } from "@/lib/ingest/calendar";

// Daily (see vercel.json): refresh program events from the Frame Fellows
// Google Calendar's secret iCal address (GCAL_ICS_URL).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const url = process.env.GCAL_ICS_URL;
  if (!url) return new NextResponse("GCAL_ICS_URL not set", { status: 500 });
  const res = await fetch(url);
  if (!res.ok) return new NextResponse(`Calendar: ${res.status}`, { status: 502 });
  return NextResponse.json({ ok: true, ...(await upsertProgramEvents(db, fromIcs(await res.text()))) });
}
