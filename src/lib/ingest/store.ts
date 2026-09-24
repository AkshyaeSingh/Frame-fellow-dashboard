import type { Platform, PrismaClient } from "@prisma/client";
import { analyzeRules } from "../analysis/rules";
import { NORMALIZERS, subtitlesToText, type NormAccount } from "./normalize";

// Writes normalized accounts into Postgres. Shared by the import script and
// the Apify webhook route. Accounts must already exist (roster/admin) — a
// scraped account that isn't mapped to a fellow is skipped and reported,
// so nobody gets tracked by accident.

type Db = PrismaClient;

export async function fetchDataset(datasetId: string, token?: string) {
  const all: unknown[] = [];
  for (let offset = 0; ; offset += 1000) {
    const qs = new URLSearchParams({ format: "json", clean: "true", limit: "1000", offset: String(offset) });
    if (token) qs.set("token", token);
    const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?${qs}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`dataset ${datasetId}: ${res.status} ${res.statusText}`);
    const page = (await res.json()) as unknown[];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

async function fetchTranscript(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const text = subtitlesToText(await res.text());
    return text.length > 20 ? text.slice(0, 60_000) : null;
  } catch {
    return null;
  }
}

export type IngestReport = { accounts: number; posts: number; unmatched: string[]; transcripts: number };

export async function ingestItems(db: Db, platform: Platform, items: unknown[], opts: { fetchTranscripts?: boolean } = {}): Promise<IngestReport> {
  const normalize = NORMALIZERS[platform];
  if (!normalize) throw new Error(`No normalizer for ${platform}`);
  const accounts = normalize(items as Record<string, unknown>[]);
  const report: IngestReport = { accounts: 0, posts: 0, unmatched: [], transcripts: 0 };

  for (const acc of accounts) {
    const account = await matchAccount(db, acc);
    if (!account) {
      report.unmatched.push(`${platform}:${acc.handle}`);
      continue;
    }
    report.accounts++;
    await db.account.update({
      where: { id: account.id },
      data: {
        externalId: acc.externalId ?? account.externalId,
        displayName: acc.displayName ?? account.displayName,
        bio: acc.bio ?? account.bio,
        avatarUrl: acc.avatarUrl ?? account.avatarUrl,
        lastScrapedAt: new Date(),
      },
    });

    if (acc.followers != null || acc.postsCount != null) {
      // One Apify snapshot per account per day.
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      const existing = await db.accountSnapshot.findFirst({ where: { accountId: account.id, source: "apify", takenAt: { gte: day } } });
      const data = {
        followers: acc.followers,
        following: acc.following,
        postsCount: acc.postsCount,
        totalViews: acc.totalViews != null ? BigInt(acc.totalViews) : null,
      };
      if (existing) await db.accountSnapshot.update({ where: { id: existing.id }, data });
      else await db.accountSnapshot.create({ data: { accountId: account.id, takenAt: new Date(), source: "apify", ...data } });
    }

    for (const p of acc.posts) {
      let transcript = p.transcript;
      const prior = await db.post.findUnique({ where: { platform_externalId: { platform, externalId: p.externalId } }, select: { transcript: true, analyzedBy: true } });
      if (!transcript && prior?.transcript) transcript = prior.transcript;
      if (!transcript && p.transcriptUrl && opts.fetchTranscripts) {
        transcript = await fetchTranscript(p.transcriptUrl);
        if (transcript) report.transcripts++;
      }
      const rules = analyzeRules({ title: p.title, caption: p.caption, transcript, hashtags: p.hashtags, links: p.links });
      // Don't clobber a richer LLM analysis with the rules pass.
      const keepLlm = prior?.analyzedBy && prior.analyzedBy !== "rules-v1";
      const data = {
        url: p.url,
        kind: p.kind,
        title: p.title,
        caption: p.caption,
        publishedAt: p.publishedAt,
        durationSec: p.durationSec,
        thumbnailUrl: p.thumbnailUrl,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        saves: p.saves,
        transcript,
        hashtags: p.hashtags,
        mentions: p.mentions,
        links: p.links,
        isSponsored: p.isSponsored || rules.isSponsored,
        collaborators: p.collaborators,
        raw: p.raw as object,
        ...(keepLlm
          ? {}
          : {
              topics: rules.topics,
              ctas: rules.ctas,
              orgsMentioned: rules.orgsMentioned,
              aiSafetyScore: rules.aiSafetyScore,
              isAiSafety: rules.isAiSafety,
              analysis: { rules: rules.matches },
              analyzedAt: new Date(),
              analyzedBy: "rules-v1",
            }),
      };
      await db.post.upsert({
        where: { platform_externalId: { platform, externalId: p.externalId } },
        create: { platform, externalId: p.externalId, fellowId: account.fellowId, accountId: account.id, ...data },
        update: data,
      });
      report.posts++;
    }
  }
  return report;
}

async function matchAccount(db: Db, acc: NormAccount) {
  if (acc.externalId) {
    const byId = await db.account.findFirst({ where: { platform: acc.platform, externalId: acc.externalId } });
    if (byId) return byId;
  }
  return db.account.findFirst({ where: { platform: acc.platform, handle: { equals: acc.handle, mode: "insensitive" } } });
}
