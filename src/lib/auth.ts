import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE, verifySession, type Role, type Session } from "@/lib/session";

// Fellow sessions are re-checked against Fellow.accessVersion so a link can be revoked.
export const getSession = cache(async (): Promise<Session | null> => {
  const s = verifySession((await cookies()).get(COOKIE)?.value);
  if (s?.role !== "fellow") return s;
  const f = await db.fellow.findUnique({ where: { id: s.fellowId }, select: { accessVersion: true } });
  return f && f.accessVersion === s.version ? s : null;
});

export async function getRole(): Promise<Role | null> {
  return (await getSession())?.role ?? null;
}

export async function requireRole(): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/login");
  return role;
}

export async function requireTeam() {
  if ((await getRole()) !== "team") throw new Error("Team access required");
}

// Team, or the fellow editing their own record. Returns who made the change.
export async function requireSelfOrTeam(fellowId: string): Promise<"team" | "fellow"> {
  const s = await getSession();
  if (s?.role === "team") return "team";
  if (s?.role === "fellow" && s.fellowId === fellowId) return "fellow";
  throw new Error("Not allowed");
}
