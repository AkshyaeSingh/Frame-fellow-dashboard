"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE, MAX_AGE, roleForPassword, signRole, signSession } from "@/lib/session";

export async function loginAction(_: string | undefined, formData: FormData) {
  const role = roleForPassword(String(formData.get("password") ?? ""));
  if (!role) return "Incorrect password";
  (await cookies()).set(COOKIE, signRole(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
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
