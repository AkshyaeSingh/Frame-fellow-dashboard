import type { Platform, PrismaClient } from "@prisma/client";
import { analyzeComment } from "../analysis/comments";

// Normalizes comment datasets from:
//   YouTube   streamers/youtube-comments-scraper
//   TikTok    clockworks/tiktok-comments-scraper
//   Instagram apify/instagram-scraper (resultsType: "comments") and posts' `latestComments`
// and stores them against the matching Post.

type Item = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NormComment = {
  postExternalId: string;
  externalId: string;
  author: string | null;
  text: string;
  likes: number | null;
  replies: number | null;
  isReply: boolean;
  creatorFlag: boolean;
  publishedAt: Date | null;
};

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() && !isNaN(Number(v)) ? Number(v) : null);
const date = (v: unknown) => {
  if (!v) return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

// "3 weeks ago" → approximate date relative to when we scraped.
function relative(text: unknown, now = new Date()) {
  const m = String(text ?? "").match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!m) return null;
  const n = Number(m[1]);
  const ms = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }[m[2]!.toLowerCase() as "day"];
  return new Date(now.getTime() - n * ms);
}

const igShortcode = (url: unknown) => String(url ?? "").match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
const ttVideoId = (url: unknown) => String(url ?? "").match(/\/video\/(\d+)/)?.[1] ?? null;
const ytVideoId = (item: Item) => item.videoId ?? String(item.pageUrl ?? "").match(/(?:v=|shorts\/)([A-Za-z0-9_-]{6,})/)?.[1] ?? null;

export function normalizeComments(platform: Platform, items: Item[]): NormComment[] {
  const out: NormComment[] = [];
  for (const i of items) {
    if (i.error) continue;
    if (platform === "YOUTUBE") {
      const vid = ytVideoId(i);
      if (!vid || !i.cid || !i.comment) continue;
      out.push({
        postExternalId: vid,
        externalId: String(i.cid),
        author: i.author ?? null,
        text: String(i.comment),
        likes: num(i.voteCount),
        replies: num(i.replyCount),
        isReply: !!i.replyToCid || i.type === "reply",
        creatorFlag: !!i.authorIsChannelOwner,
        publishedAt: relative(i.publishedTimeText),
      });
    } else if (platform === "TIKTOK") {
      const vid = ttVideoId(i.submittedVideoUrl ?? i.videoWebUrl);
      if (!vid || !i.cid || !i.text) continue;
      out.push({
        postExternalId: vid,
        externalId: String(i.cid),
        author: i.uniqueId ?? null,
        text: String(i.text),
        likes: num(i.diggCount),
        replies: num(i.replyCommentTotal),
        isReply: !!i.repliesToId,
        creatorFlag: false,
        publishedAt: date(i.createTimeISO ?? i.createTime),
      });
    } else if (platform === "INSTAGRAM") {
      const code = igShortcode(i.postUrl ?? i.inputUrl ?? i.url);
      if (!code || !i.id || !i.text) continue;
      out.push({
        postExternalId: code,
        externalId: String(i.id),
        author: i.ownerUsername ?? i.owner?.username ?? null,
        text: String(i.text),
        likes: num(i.likesCount),
        replies: num(i.repliesCount),
        isReply: false,
        creatorFlag: false,
        publishedAt: date(i.timestamp),
      });
    }
  }
  return out;
}

export async function storeComments(db: PrismaClient, platform: Platform, comments: NormComment[]) {
  const posts = await db.post.findMany({
    where: { platform, externalId: { in: [...new Set(comments.map((c) => c.postExternalId))] } },
    select: { id: true, externalId: true, fellowId: true, account: { select: { handle: true } } },
  });
  const byExt = new Map(posts.map((p) => [p.externalId, p]));
  let stored = 0;
  let unmatched = 0;
  const touched = new Set<string>();
  for (const c of comments) {
    const post = byExt.get(c.postExternalId);
    if (!post) {
      unmatched++;
      continue;
    }
    const handle = post.account.handle.replace(/^@/, "").toLowerCase();
    const isCreator = c.creatorFlag || (c.author ?? "").replace(/^@/, "").toLowerCase() === handle;
    const a = analyzeComment(c.text);
    const data = {
      postId: post.id,
      fellowId: post.fellowId,
      author: c.author,
      text: c.text.slice(0, 4000),
      likes: c.likes,
      replies: c.replies,
      isReply: c.isReply,
      isCreator,
      publishedAt: c.publishedAt,
      sentiment: isCreator ? null : a.sentiment,
      signals: isCreator ? [] : a.signals,
      analyzedBy: "rules-v1",
    };
    await db.comment.upsert({
      where: { platform_externalId: { platform, externalId: c.externalId } },
      create: { platform, externalId: c.externalId, ...data },
      update: data,
    });
    touched.add(post.id);
    stored++;
  }
  if (touched.size) await db.post.updateMany({ where: { id: { in: [...touched] } }, data: { commentsScrapedAt: new Date() } });
  return { stored, unmatched, posts: touched.size };
}
