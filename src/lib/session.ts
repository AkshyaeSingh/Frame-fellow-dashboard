import { createHmac, timingSafeEqual } from "crypto";

// Signed-cookie sessions with two roles:
//   team   — full access, can edit outcomes/Trudy/handles
//   funder — read-only, "private" form answers hidden
// Imported by proxy.ts (Node runtime) and server code — keep it framework-free.

export type Role = "team" | "funder";
export const COOKIE = "fi_session";
export const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function signRole(role: Role) {
  const value = `${role}.${Date.now()}`;
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function verifyRole(cookie: string | undefined): Role | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i < 0) return null;
  const value = cookie.slice(0, i);
  const expected = Buffer.from(createHmac("sha256", secret()).update(value).digest("base64url"));
  const actual = Buffer.from(cookie.slice(i + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const [role, ts] = value.split(".");
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return null;
  return role === "team" || role === "funder" ? role : null;
}

export function roleForPassword(input: string): Role | null {
  const eq = (a: string, b?: string) => {
    if (!b) return false;
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  if (eq(input, process.env.TEAM_PASSWORD)) return "team";
  if (eq(input, process.env.FUNDER_PASSWORD)) return "funder";
  return null;
}
