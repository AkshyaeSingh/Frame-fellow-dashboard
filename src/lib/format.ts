export function compact(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pct(n: number | null | undefined, digits = 1) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function money(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function rateRange(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${money(min)}–${money(max)}`;
  return money(min ?? max);
}

export function relativeDate(d: Date | null | undefined) {
  if (!d) return "never";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

export function shortDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Point in time n days ago (kept out of components so renders stay pure).
export function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}
