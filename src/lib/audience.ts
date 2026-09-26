import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { COMMENT_SIGNALS } from "@/lib/analysis/comments";

// Aggregates audience comments (excluding the creator's own replies).
export async function audienceSummary(where: Prisma.CommentWhereInput) {
  const comments = await db.comment.findMany({
    where: { ...where, isCreator: false },
    select: {
      id: true,
      text: true,
      author: true,
      likes: true,
      sentiment: true,
      signals: true,
      platform: true,
      publishedAt: true,
      fellowId: true,
      post: { select: { id: true, url: true, title: true, caption: true, publishedAt: true, views: true, isAiSafety: true } },
    },
  });
  const sentiment = { positive: 0, neutral: 0, mixed: 0, negative: 0 } as Record<string, number>;
  const signals = Object.fromEntries(COMMENT_SIGNALS.map((s) => [s.slug, 0])) as Record<string, number>;
  for (const c of comments) {
    sentiment[c.sentiment ?? "neutral"] = (sentiment[c.sentiment ?? "neutral"] ?? 0) + 1;
    for (const s of c.signals) signals[s] = (signals[s] ?? 0) + 1;
  }
  const bySignal = (slug: string, n = 6) =>
    comments
      .filter((c) => c.signals.includes(slug) && c.text.length > 12)
      .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
      .slice(0, n);

  const posts = new Map<string, { post: (typeof comments)[number]["post"]; n: number; pos: number; neg: number; mind: number; action: number; pushback: number }>();
  for (const c of comments) {
    const p = posts.get(c.post.id) ?? { post: c.post, n: 0, pos: 0, neg: 0, mind: 0, action: 0, pushback: 0 };
    p.n++;
    if (c.sentiment === "positive") p.pos++;
    if (c.sentiment === "negative") p.neg++;
    if (c.signals.includes("changed-mind") || c.signals.includes("learned")) p.mind++;
    if (c.signals.includes("action")) p.action++;
    if (c.signals.includes("pushback") || c.signals.includes("doomer-label")) p.pushback++;
    posts.set(c.post.id, p);
  }
  return { total: comments.length, sentiment, signals, bySignal, posts: [...posts.values()].sort((a, b) => b.n - a.n), comments };
}
