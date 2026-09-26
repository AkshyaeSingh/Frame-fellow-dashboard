import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { startCommentScrape, startPostScrape, webhookUrl } from "@/lib/scrape";

// Weekly (see vercel.json): scrape the last 21 days of posts for every tracked
// account, plus comments on recent posts. Apify calls /api/apify-webhook when
// each run finishes, which imports it.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const token = process.env.APIFY_TOKEN;
  if (!token) return new NextResponse("APIFY_TOKEN not set", { status: 500 });
  if (!webhookUrl()) return new NextResponse("PUBLIC_URL / WEBHOOK_SECRET not set, so runs couldn't be imported", { status: 500 });
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10);
  const posts = await startPostScrape(token, since, 30);
  const comments = await startCommentScrape(token);
  return NextResponse.json({ ok: true, started: [...posts, ...comments] });
}
