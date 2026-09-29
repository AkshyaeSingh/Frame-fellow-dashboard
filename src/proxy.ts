import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

// Everything is private. Only the login page, fellow sign-in links, the Apify
// webhook and the cron routes (each checks its own secret) are reachable
// without a valid session. Fellows are limited to their own area.
const FELLOW_PATHS = ["/me", "/fellows/", "/cohort", "/opportunities"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/join/") || pathname.startsWith("/api/apify-webhook") || pathname.startsWith("/api/cron/")) return NextResponse.next();
  const s = verifySession(req.cookies.get(COOKIE)?.value);
  if (s?.role === "fellow") {
    if (FELLOW_PATHS.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`))) return NextResponse.next();
    return NextResponse.redirect(new URL("/me", req.url));
  }
  if (s) return NextResponse.next();
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
