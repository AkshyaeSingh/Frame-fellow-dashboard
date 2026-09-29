import { createHmac, timingSafeEqual } from "crypto";

// Signed-cookie sessions with three roles:
//   team   — full access, can edit everything
//   funder — read-only, "private" form answers and team notes hidden
//   fellow — one fellow: their own dashboard (editable profile) + cohort content
// Imported by proxy.ts (Node runtime) and server code — keep it framework-free.

export type Role = "team" | "funder" | "fellow";
export type Session = { role: Role; fellowId?: string; version?: number };
export const COOKIE = "fi_session";
export const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

const mac = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signSession(s: Session) {
  const who = s.role === "fellow" ? `fellow:${s.fellowId}:${s.version ?? 1}` : s.role;
  const value = `${who}.${Date.now()}`;
  return `${value}.${mac(value)}`;
}

export const signRole = (role: "team" | "funder") => signSession({ role });

export function verifySession(cookie: string | undefined): Session | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i < 0) return null;
  const value = cookie.slice(0, i);
  if (!safeEqual(mac(value), cookie.slice(i + 1))) return null;
  const j = value.lastIndexOf(".");
  const who = value.slice(0, j);
  if (Date.now() - Number(value.slice(j + 1)) > MAX_AGE * 1000) return null;
  if (who === "team" || who === "funder") return { role: who };
  const m = who.match(/^fellow:([a-z0-9]+):(\d+)$/);
  return m ? { role: "fellow", fellowId: m[1]!, version: Number(m[2]) } : null;
}

export const verifyRole = (cookie: string | undefined): Role | null => verifySession(cookie)?.role ?? null;

// Personal sign-in links for fellows: /join/<fellowId>.<version>.<mac>.
// Bumping Fellow.accessVersion invalidates the link and any sessions from it.
export function inviteToken(fellowId: string, version: number) {
  const value = `${fellowId}.${version}`;
  return `${value}.${mac(`invite:${value}`)}`;
}

export function verifyInvite(token: string) {
  const [id, v, sig] = token.split(".");
  if (!id || !v || !sig || !safeEqual(mac(`invite:${id}.${v}`), sig)) return null;
  return { fellowId: id, version: Number(v) };
}

export function roleForPassword(input: string): "team" | "funder" | null {
  if (process.env.TEAM_PASSWORD && safeEqual(input, process.env.TEAM_PASSWORD)) return "team";
  if (process.env.FUNDER_PASSWORD && safeEqual(input, process.env.FUNDER_PASSWORD)) return "funder";
  return null;
}
