import "server-only";
import type { NextRequest } from "next/server";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts ?token= for manual runs.
export function cronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("token") === secret;
}
