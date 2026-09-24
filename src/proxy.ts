import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyRole } from "@/lib/session";

// Everything is private. Only the login page and the Apify webhook (which
// checks its own secret) are reachable without a valid session.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/apify-webhook")) return NextResponse.next();
  if (verifyRole(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
