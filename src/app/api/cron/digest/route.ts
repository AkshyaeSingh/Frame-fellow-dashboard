import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { buildDigest } from "@/lib/digest";

// Weekly Slack digest (see vercel.json). Posts to a Slack incoming webhook.
// Add ?dry=1 to return the message without posting.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const msg = await buildDigest();
  if (req.nextUrl.searchParams.get("dry")) return NextResponse.json(msg);
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return new NextResponse("SLACK_WEBHOOK_URL not set", { status: 500 });
  const res = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(msg) });
  if (!res.ok) return new NextResponse(`Slack: ${res.status} ${await res.text()}`, { status: 502 });
  return NextResponse.json({ ok: true });
}
