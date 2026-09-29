import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { syncSlack } from "@/lib/slack";

// Daily (see vercel.json): pull new messages from channels the Frame bot is in.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });
  if (!process.env.SLACK_BOT_TOKEN) return new NextResponse("SLACK_BOT_TOKEN not set", { status: 500 });
  return NextResponse.json({ ok: true, ...(await syncSlack()) });
}
