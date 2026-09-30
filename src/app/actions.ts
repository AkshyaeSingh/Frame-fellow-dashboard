"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { COOKIE, MAX_AGE, roleForPassword, signRole, signSession } from "@/lib/session";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE } as const;

// One sign-in form for everyone:
//   admin  + TEAM_PASSWORD    → team
//   funder + FUNDER_PASSWORD  → read-only funder view
//   <first name> + their own password → that fellow
export async function loginAction(_: string | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fail = async (msg = "Incorrect username or password") => {
    await new Promise((r) => setTimeout(r, 600));
    return msg;
  };
  if (username === "admin" || username === "funder") {
    const role = roleForPassword(password);
    if (!role || (username === "admin") !== (role === "team")) return fail();
    (await cookies()).set(COOKIE, signRole(role), COOKIE_OPTS);
    const next = String(formData.get("next") ?? "/");
    redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }
  const f = await db.fellow.findUnique({ where: { username }, select: { id: true, accessVersion: true, passwordHash: true } });
  if (!f || !(await verifyPassword(password, f.passwordHash))) return fail();
  (await cookies()).set(COOKIE, signSession({ role: "fellow", fellowId: f.id, version: f.accessVersion }), COOKIE_OPTS);
  redirect("/me");
}

export async function logoutAction() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// One-click sign-in for local development only.
export async function devLoginAction(formData: FormData) {
  if (process.env.NODE_ENV !== "development") throw new Error("Not available");
  const r = String(formData.get("role"));
  if (r.startsWith("fellow:")) {
    const f = await db.fellow.findUniqueOrThrow({ where: { slug: r.slice(7) }, select: { id: true, accessVersion: true } });
    (await cookies()).set(COOKIE, signSession({ role: "fellow", fellowId: f.id, version: f.accessVersion }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
    redirect("/me");
  }
  (await cookies()).set(COOKIE, signRole(r === "funder" ? "funder" : "team"), { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
  redirect("/");
}
