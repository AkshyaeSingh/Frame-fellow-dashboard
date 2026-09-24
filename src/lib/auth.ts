import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifyRole, type Role } from "@/lib/session";

export async function getRole(): Promise<Role | null> {
  return verifyRole((await cookies()).get(COOKIE)?.value);
}

export async function requireRole(): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/login");
  return role;
}

export async function requireTeam() {
  const role = await getRole();
  if (role !== "team") throw new Error("Team access required");
}
