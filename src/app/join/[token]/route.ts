import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { COOKIE, MAX_AGE, signSession, verifyInvite } from "@/lib/session";

// A fellow's personal sign-in link. Sets a fellow session and lands on their dashboard.
export async function GET(req: NextRequest, ctx: RouteContext<"/join/[token]">) {
  const { token } = await ctx.params;
  const inv = verifyInvite(token);
  const f = inv && (await db.fellow.findUnique({ where: { id: inv.fellowId }, select: { id: true, accessVersion: true } }));
  if (!inv || !f || f.accessVersion !== inv.version) return new NextResponse("This link is no longer valid. Ask the Frame team for a new one.", { status: 403 });
  const res = NextResponse.redirect(new URL("/me", req.url));
  res.cookies.set(COOKIE, signSession({ role: "fellow", fellowId: f.id, version: f.accessVersion }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
