// Maps raw Apify dataset items onto one common shape, per platform.
// Ported from Frame-Agent's lib/scrapers/*.js (Instagram, YouTube, LinkedIn)
// and extended with TikTok and X. Each normalizer groups items by account.

import type { Platform } from "@prisma/client";

export type NormPost = {
  externalId: string;
  url: string | null;
  kind: string | null;
  title: string | null;
  caption: string | null;
  publishedAt: Date | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  transcript: string | null;
  transcriptUrl: string | null; // fetched later if transcript is missing
  hashtags: string[];
  mentions: string[];
  links: string[];
  isSponsored: boolean;
  collaborators: string[];
  raw: unknown;
};

export type NormAccount = {
  platform: Platform;
  handle: string; // always "@name" lowercase (LinkedIn/Substack: slug)
  externalId: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followers: number | null;
  following: number | null;
  postsCount: number | null;
  totalViews: number | null;
  posts: NormPost[];
};

type Item = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && v.trim() && !isNaN(Number(v)) ? Math.round(Number(v)) : null);
const date = (v: unknown) => {
  if (!v) return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};
const handleOf = (s: string) => `@${s.replace(/^@/, "").toLowerCase()}`;
const uniq = (a: (string | null | undefined)[]) => [...new Set(a.filter((x): x is string => !!x))];

function hms(s: unknown): number | null {
  if (typeof s === "number") return Math.round(s);
  if (typeof s !== "string" || !s) return null;
  const parts = s.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function group<T>(items: Item[], key: (i: Item) => string | null | undefined, build: (key: string, items: Item[]) => T): T[] {
  const m = new Map<string, Item[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return [...m.entries()].map(([k, v]) => build(k, v));
}

// ---------- YouTube (streamers/youtube-scraper) ----------
function youtube(items: Item[]): NormAccount[] {
  return group(
    items.filter((i) => !i.error && i.id && (i.channelUsername || i.channelId)),
    (i) => i.channelId ?? i.channelUsername,
    (_k, its) => {
      const f = its[0]!;
      return {
        platform: "YOUTUBE" as const,
        handle: handleOf(f.channelUsername ?? f.channelId),
        externalId: f.channelId ?? null,
        displayName: f.channelName ?? null,
        bio: f.channelDescription ?? f.aboutChannelInfo?.channelDescription ?? null,
        avatarUrl: f.channelAvatarUrl ?? f.aboutChannelInfo?.channelAvatarUrl ?? null,
        followers: num(f.numberOfSubscribers ?? f.aboutChannelInfo?.numberOfSubscribers),
        following: null,
        postsCount: num(f.channelTotalVideos ?? f.aboutChannelInfo?.channelTotalVideos),
        totalViews: num(f.channelTotalViews ?? f.aboutChannelInfo?.channelTotalViews),
        posts: its.map((i) => {
          const subs = Array.isArray(i.subtitles) ? i.subtitles : [];
          const plain = subs.map((s: Item) => s.plaintext).find((t: unknown) => typeof t === "string" && t.length > 0) ?? null;
          return {
            externalId: String(i.id),
            url: i.url ?? `https://www.youtube.com/watch?v=${i.id}`,
            kind: i.type === "shorts" ? "short" : i.type === "stream" ? "stream" : "video",
            title: i.title ?? null,
            caption: i.text ?? null,
            publishedAt: date(i.date),
            durationSec: hms(i.duration),
            thumbnailUrl: i.thumbnailUrl ?? null,
            views: num(i.viewCount),
            likes: num(i.likes),
            comments: num(i.commentsCount),
            shares: null,
            saves: null,
            transcript: plain,
            transcriptUrl: i.transcriptionUrl ?? null,
            hashtags: (i.hashtags ?? []).map((h: string) => h.replace(/^#/, "")),
            mentions: [],
            links: uniq((i.descriptionLinks ?? []).map((l: Item) => l.url)),
            isSponsored: !!i.isPaidContent,
            collaborators: uniq((i.collaborators ?? []).map((c: Item) => c.username ?? c.name)),
            raw: i,
          };
        }),
      };
    },
  );
}

// ---------- Instagram (apify/instagram-scraper, posts or details) ----------
function instagram(items: Item[]): NormAccount[] {
  // "details" results are profile objects (have `username` + followersCount).
  const profiles = items.filter((i) => i.username && i.followersCount != null && !i.shortCode);
  const posts = items.filter((i) => i.ownerUsername && (i.shortCode || i.id));
  const out: NormAccount[] = group(
    posts,
    (i) => String(i.ownerUsername).toLowerCase(),
    (k, its): NormAccount => {
      const f = its[0]!;
      return {
        platform: "INSTAGRAM" as const,
        handle: handleOf(k),
        externalId: f.ownerId ?? null,
        displayName: f.ownerFullName ?? null,
        bio: null,
        avatarUrl: null,
        followers: null,
        following: null,
        postsCount: null,
        totalViews: null,
        posts: its.map((i) => ({
          externalId: String(i.shortCode ?? i.id),
          url: i.url ?? null,
          kind: i.productType === "clips" || i.type === "Video" ? "reel" : i.type === "Sidecar" ? "carousel" : "image",
          title: null,
          caption: i.caption ?? null,
          publishedAt: date(i.timestamp),
          durationSec: num(i.videoDuration),
          thumbnailUrl: i.displayUrl ?? null,
          views: num(i.videoPlayCount ?? i.videoViewCount),
          likes: num(i.likesCount) != null && i.likesCount >= 0 ? num(i.likesCount) : null,
          comments: num(i.commentsCount),
          shares: null,
          saves: null,
          transcript: null,
          transcriptUrl: null,
          hashtags: i.hashtags ?? [],
          mentions: i.mentions ?? [],
          links: [],
          isSponsored: !!i.paidPartnership,
          collaborators: uniq((i.coauthorProducers ?? []).map((c: Item) => c.username)),
          raw: i,
        })),
      };
    },
  );
  for (const p of profiles) {
    const h = handleOf(p.username);
    const acct = out.find((a) => a.handle === h);
    const fields = {
      externalId: p.id ?? null,
      displayName: p.fullName ?? null,
      bio: p.biography ?? null,
      avatarUrl: p.profilePicUrlHD ?? p.profilePicUrl ?? null,
      followers: num(p.followersCount),
      following: num(p.followsCount),
      postsCount: num(p.postsCount),
    };
    if (acct) Object.assign(acct, fields);
    else out.push({ platform: "INSTAGRAM", handle: h, totalViews: null, posts: [], ...fields });
  }
  return out;
}

// ---------- TikTok (clockworks/tiktok-scraper) ----------
function tiktok(items: Item[]): NormAccount[] {
  return group(
    items.filter((i) => i.id && i.authorMeta?.name),
    (i) => String(i.authorMeta.name).toLowerCase(),
    (k, its) => {
      const a = its[0]!.authorMeta;
      return {
        platform: "TIKTOK" as const,
        handle: handleOf(k),
        externalId: a.id ?? null,
        displayName: a.nickName ?? null,
        bio: a.signature ?? null,
        avatarUrl: a.avatar ?? null,
        followers: num(a.fans),
        following: num(a.following),
        postsCount: num(a.video),
        totalViews: null,
        posts: its.map((i) => {
          const subs: Item[] = i.videoMeta?.subtitleLinks ?? [];
          const eng = subs.find((s) => /^eng|^en/i.test(s.language ?? "")) ?? subs[0];
          return {
            externalId: String(i.id),
            url: i.webVideoUrl ?? null,
            kind: i.isSlideshow ? "slideshow" : "video",
            title: null,
            caption: i.text ?? null,
            publishedAt: date(i.createTimeISO ?? i.createTime),
            durationSec: num(i.videoMeta?.duration),
            thumbnailUrl: i.videoMeta?.coverUrl ?? null,
            views: num(i.playCount),
            likes: num(i.diggCount),
            comments: num(i.commentCount),
            shares: num(i.shareCount),
            saves: num(i.collectCount),
            transcript: null,
            transcriptUrl: eng?.downloadLink ?? i.videoMeta?.transcriptionLink ?? null,
            hashtags: (i.hashtags ?? []).map((h: Item) => h.name).filter(Boolean),
            mentions: i.mentions ?? [],
            links: [],
            isSponsored: !!(i.isAd || i.isSponsored),
            collaborators: [],
            raw: i,
          };
        }),
      };
    },
  );
}

// ---------- X (apidojo/tweet-scraper) ----------
function xTwitter(items: Item[]): NormAccount[] {
  return group(
    items.filter((i) => i.id && i.author?.userName && !i.isRetweet),
    (i) => String(i.author.userName).toLowerCase(),
    (k, its) => {
      const a = its[0]!.author;
      return {
        platform: "X" as const,
        handle: handleOf(k),
        externalId: a.id ?? null,
        displayName: a.name ?? null,
        bio: a.description ?? null,
        avatarUrl: a.profilePicture ?? null,
        followers: num(a.followers),
        following: num(a.following),
        postsCount: num(a.statusesCount),
        totalViews: null,
        posts: its.map((i) => ({
          externalId: String(i.id),
          url: i.url ?? i.twitterUrl ?? null,
          kind: i.isReply ? "reply" : i.isQuote ? "quote" : "tweet",
          title: null,
          caption: i.fullText ?? i.text ?? null,
          publishedAt: date(i.createdAt),
          durationSec: null,
          thumbnailUrl: i.extendedEntities?.media?.[0]?.media_url_https ?? null,
          views: num(i.viewCount),
          likes: num(i.likeCount),
          comments: num(i.replyCount),
          shares: (num(i.retweetCount) ?? 0) + (num(i.quoteCount) ?? 0),
          saves: num(i.bookmarkCount),
          transcript: null,
          transcriptUrl: null,
          hashtags: (i.entities?.hashtags ?? []).map((h: Item) => h.text).filter(Boolean),
          mentions: (i.entities?.user_mentions ?? []).map((m: Item) => m.screen_name).filter(Boolean),
          links: uniq((i.entities?.urls ?? []).map((u: Item) => u.expanded_url)),
          isSponsored: false,
          collaborators: [],
          raw: i,
        })),
      };
    },
  );
}

// ---------- LinkedIn (posts scraper; shape from Frame-Agent) ----------
function linkedin(items: Item[]): NormAccount[] {
  return group(
    items.filter((i) => i.author?.id && i.id),
    (i) => String(i.author.publicIdentifier ?? i.author.id),
    (k, its) => {
      const a = its[0]!.author;
      return {
        platform: "LINKEDIN" as const,
        handle: k.toLowerCase(),
        externalId: a.id ?? null,
        displayName: a.name ?? null,
        bio: a.info ?? null,
        avatarUrl: a.avatar?.url ?? null,
        followers: num(a.followers ?? a.followersCount),
        following: null,
        postsCount: null,
        totalViews: null,
        posts: its.map((i) => ({
          externalId: String(i.id),
          url: i.linkedinUrl ?? null,
          kind: "post",
          title: null,
          caption: i.content ?? null,
          publishedAt: date(i.postedAt?.date ?? i.postedAt),
          durationSec: null,
          thumbnailUrl: null,
          views: null,
          likes: num(i.engagement?.likes),
          comments: num(i.engagement?.comments),
          shares: num(i.engagement?.shares),
          saves: null,
          transcript: null,
          transcriptUrl: null,
          hashtags: [],
          mentions: [],
          links: [],
          isSponsored: false,
          collaborators: [],
          raw: i,
        })),
      };
    },
  );
}

export const NORMALIZERS: Partial<Record<Platform, (items: Item[]) => NormAccount[]>> = {
  YOUTUBE: youtube,
  INSTAGRAM: instagram,
  TIKTOK: tiktok,
  X: xTwitter,
  LINKEDIN: linkedin,
};

// VTT/SRT → plain text.
export function subtitlesToText(s: string) {
  return s
    .replace(/^WEBVTT.*$/m, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^(NOTE|STYLE|Kind:|Language:)/.test(l))
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter((l, i, arr) => l !== arr[i - 1]) // drop rolling duplicates
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
