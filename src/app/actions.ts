"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, MAX_AGE, roleForPassword, signRole } from "@/lib/session";

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
  const role = formData.get("role") === "funder" ? "funder" : "team";
  (await cookies()).set(COOKIE, signRole(role), { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
  redirect("/");
}
