import "server-only";
import { db } from "@/lib/db";
import { compact } from "@/lib/format";
import { scoredPosts } from "@/lib/outliers";

// Weekly Slack digest. Deliberately team-safe: numbers, public posts and
// public comments only. Meeting notes and form answers never leave the app.

const DAY = 86_400_000;

export async function buildDigest(now = new Date()) {
  const base = (process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeks = new Date(now.getTime() - 14 * DAY);

  const [fellows, newPosts, scored, comments, openActions, runs] = await Promise.all([
    db.fellow.findMany({ select: { id: true, name: true, slug: true, _count: { select: { accounts: true } }, cohort: { select: { name: true, startDate: true, endDate: true } }, posts: { select: { publishedAt: true }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, take: 1 } } }),
    db.post.findMany({ where: { publishedAt: { gte: weekAgo } }, select: { fellowId: true, views: true, isAiSafety: true } }),
    scoredPosts({ publishedAt: { gte: twoWeeks } }),
    db.comment.findMany({ where: { isCreator: false, createdAt: { gte: weekAgo } }, select: { text: true, likes: true, signals: true, sentiment: true, post: { select: { url: true } }, fellow: { select: { name: true } } } }),
    db.fellowNote.count({ where: { kind: "action", done: false } }),
    db.scrapeRun.findMany({ where: { createdAt: { gte: weekAgo } }, select: { platform: true, status: true } }),
  ]);
  const slackConcerns = await db.slackMessage.findMany({ where: { postedAt: { gte: weekAgo }, signals: { has: "concern" } }, select: { fellow: { select: { name: true, slug: true } } } });

  const active = fellows.filter((f) => f.cohort.startDate <= now && f.cohort.endDate >= new Date(now.getTime() - 90 * DAY));
  const tracked = active.filter((f) => f._count.accounts > 0);
  const untracked = active.filter((f) => f._count.accounts === 0);
  const quiet = tracked.filter((f) => !f.posts[0]?.publishedAt || f.posts[0].publishedAt < twoWeeks);
  const views = newPosts.reduce((s, p) => s + (p.views ?? 0), 0);
  const ais = newPosts.filter((p) => p.isAiSafety).length;
  const outliers = scored.filter((p) => p.multiplier >= 3).sort((a, b) => b.multiplier - a.multiplier).slice(0, 5);
  const sig = (s: string) => comments.filter((c) => c.signals.includes(s)).length;
  const quote = comments
    .filter((c) => (c.signals.includes("changed-mind") || c.signals.includes("action")) && c.text.length > 30 && c.text.length < 280)
    .sort((a, b) => Number(b.signals.includes("changed-mind")) - Number(a.signals.includes("changed-mind")) || (b.likes ?? 0) - (a.likes ?? 0))[0];
  const failed = runs.filter((r) => ["FAILED", "ABORTED", "TIMED-OUT"].includes(r.status));

  const link = (path: string, text: string) => (base ? `<${base}${path}|${text}>` : text);
  const lines = [
    `*Output:* ${newPosts.length} posts from ${new Set(newPosts.map((p) => p.fellowId)).size} fellows (${ais} on AI safety), ${compact(views)} views so far`,
    outliers.length
      ? `*Outliers (≥3× their usual, last 14 days):*\n${outliers.map((p) => `• ${p.multiplier.toFixed(1)}× ${p.fellow.name}: <${p.url}|${(p.title ?? p.caption ?? "post").replace(/\s+/g, " ").slice(0, 70).replace(/[<>|]/g, "")}> (${compact(p.views)} views)`).join("\n")}`
      : "*Outliers:* none ≥3× this week",
    comments.length
      ? `*Audience:* ${comments.length} new comments read · ${sig("changed-mind") + sig("learned")} changed mind/learned · ${sig("action")} action intent · ${sig("pushback") + sig("doomer-label")} pushback`
      : null,
    quote ? `> “${quote.text.replace(/\n/g, " ")}” (on ${quote.fellow.name}'s <${quote.post.url}|post>)` : null,
    quiet.length ? `*Quiet for 2+ weeks:* ${quiet.map((f) => link(`/fellows/${f.slug}`, f.name)).join(", ")}` : null,
    untracked.length ? `*No handles tracked yet:* ${untracked.map((f) => f.name).join(", ")}` : null,
    openActions ? `*Open action items:* ${openActions}` : null,
    slackConcerns.length
      ? `*Raised a concern in Slack:* ${[...new Map(slackConcerns.filter((m) => m.fellow).map((m) => [m.fellow!.slug, m.fellow!])).values()].map((f) => link(`/fellows/${f.slug}?tab=context`, f.name)).join(", ")}`
      : null,
    failed.length ? `:warning: ${failed.length} scrape runs failed (${[...new Set(failed.map((r) => r.platform))].join(", ")}), so check ${link("/data", "Data")}` : null,
  ].filter(Boolean) as string[];

  return {
    text: `Frame fellows: weekly digest`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `Frame fellows · week to ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` } },
      ...lines.map((t) => ({ type: "section", text: { type: "mrkdwn", text: t } })),
      ...(base ? [{ type: "context", elements: [{ type: "mrkdwn", text: `${link("/", "Dashboard")} · ${link("/outliers", "Outliers")}` }] }] : []),
    ],
  };
}
