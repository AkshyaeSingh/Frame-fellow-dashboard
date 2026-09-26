import type { Platform } from "@prisma/client";

// Which Apify Actor scrapes each platform, and how to build its input from
// our tracked handles. Costs are per result on the free tier (Sept 2026).

type Acct = { handle: string; url: string | null };

export const ACTORS: Partial<Record<Platform, { actor: string; costPerItem: number; input: (accts: Acct[], since: string, perAccount: number) => object }>> = {
  YOUTUBE: {
    actor: "streamers/youtube-scraper",
    costPerItem: 0.004,
    input: (a, since, n) => ({
      startUrls: a.map((x) => ({ url: x.url ?? `https://www.youtube.com/${x.handle}` })),
      maxResults: n,
      maxResultsShorts: n,
      oldestPostDate: since,
      transcriptionAndSubtitle: "ALWAYS_SUBTITLES",
      subtitlesLanguage: "any",
      subtitlesFormat: "plaintext",
    }),
  },
  INSTAGRAM: {
    actor: "apify/instagram-scraper",
    costPerItem: 0.0027,
    input: (a, since, n) => ({
      directUrls: a.map((x) => x.url ?? `https://www.instagram.com/${x.handle.replace(/^@/, "")}/`),
      resultsType: "posts",
      resultsLimit: n,
      onlyPostsNewerThan: since,
    }),
  },
  TIKTOK: {
    actor: "clockworks/tiktok-scraper",
    costPerItem: 0.0037,
    input: (a, since, n) => ({
      profiles: a.map((x) => x.handle.replace(/^@/, "")),
      resultsPerPage: n,
      oldestPostDateUnified: since,
      downloadSubtitlesOptions: "DOWNLOAD_SUBTITLES",
    }),
  },
  X: {
    actor: "apidojo/tweet-scraper",
    costPerItem: 0.0004,
    input: (a, since, n) => ({ twitterHandles: a.map((x) => x.handle.replace(/^@/, "")), maxItems: n * a.length, sort: "Latest", start: since }),
  },
  LINKEDIN: {
    actor: "harvestapi/linkedin-profile-posts",
    costPerItem: 0.002,
    input: (a, _since, n) => ({ targetUrls: a.map((x) => x.url ?? `https://www.linkedin.com/in/${x.handle}/`), maxPosts: n }),
  },
};

// Comment scrapers, fed with post URLs.
export const COMMENT_ACTORS: Partial<Record<Platform, { actor: string; input: (urls: string[]) => object }>> = {
  YOUTUBE: {
    actor: "streamers/youtube-comments-scraper",
    input: (urls) => ({ startUrls: urls.map((url) => ({ url })), maxComments: 60, sortCommentsBy: "TOP_COMMENTS" }),
  },
  TIKTOK: {
    actor: "clockworks/tiktok-comments-scraper",
    input: (urls) => ({ postURLs: urls, commentsPerPost: 80, maxRepliesPerComment: 0 }),
  },
};

// Instagram follower counts need a separate "details" run.
export const IG_PROFILE_INPUT = (a: Acct[]) => ({
  directUrls: a.map((x) => x.url ?? `https://www.instagram.com/${x.handle.replace(/^@/, "")}/`),
  resultsType: "details",
});

const API = "https://api.apify.com/v2";

export async function startRun(token: string, actor: string, input: object, webhookUrl?: string, platform?: Platform, kind: "posts" | "comments" = "posts") {
  const qs = new URLSearchParams({ token });
  if (webhookUrl && platform) {
    const hooks = [{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: webhookUrl, payloadTemplate: `{"platform":"${platform}","kind":"${kind}","resource":{{resource}}}` }];
    qs.set("webhooks", Buffer.from(JSON.stringify(hooks)).toString("base64"));
  }
  const res = await fetch(`${API}/acts/${actor.replace("/", "~")}/runs?${qs}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify start ${actor}: ${res.status} ${await res.text()}`);
  const { data } = (await res.json()) as { data: { id: string; defaultDatasetId: string; status: string } };
  return data;
}

export async function getRun(token: string, runId: string) {
  const res = await fetch(`${API}/actor-runs/${runId}?token=${token}`);
  if (!res.ok) throw new Error(`Apify run ${runId}: ${res.status}`);
  const { data } = (await res.json()) as { data: { id: string; status: string; defaultDatasetId: string } };
  return data;
}
