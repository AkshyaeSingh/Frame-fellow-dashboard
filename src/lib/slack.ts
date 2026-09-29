import "server-only";
import { db } from "@/lib/db";

// Daily Slack sync (see /api/cron/slack-sync).
//
// Reads only channels the Frame bot has been invited to (never DMs), keeps
// messages written by fellows, tags them with simple signals, and turns event
// links anyone posts (Luma, Partiful, Eventbrite) into Resources.
//
// Setup: a Slack app with bot scopes channels:history, channels:read,
// groups:history, groups:read, users:read. Install it, set SLACK_BOT_TOKEN,
// then /invite the bot to the channels to include.

const API = "https://slack.com/api";
const DAY = 86_400_000;

async function slack<T>(method: string, params: Record<string, string | number | undefined>): Promise<T> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/${method}?${qs}`, { headers: { authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, Number(res.headers.get("retry-after") ?? 2) * 1000));
      continue;
    }
    const body = (await res.json()) as T & { ok: boolean; error?: string };
    if (!body.ok) throw new Error(`Slack ${method}: ${body.error}`);
    return body;
  }
  throw new Error(`Slack ${method}: rate limited`);
}

type SlackUser = { id: string; deleted?: boolean; is_bot?: boolean; real_name?: string; profile?: { real_name?: string; display_name?: string } };
type SlackMsg = { ts: string; user?: string; text?: string; thread_ts?: string; reply_count?: number; reactions?: { count: number }[]; subtype?: string };

export const SLACK_SIGNALS: { slug: string; label: string; test: RegExp }[] = [
  { slug: "concern", label: "Concern / blocker", test: /\b(stuck|struggl|overwhelm|worried|blocked|behind on|burn(t|ed)? ?out|anxious|stress|confus|frustrat|can'?t figure|not sure how|help me)\b/i },
  { slug: "win", label: "Win", test: /\b(posted|published|launched|went live|just dropped|is live|hit \d|[\d.,]+k? (views|followers|subs)|milestone|accepted|got the grant|featured)\b/i },
  { slug: "event", label: "Event", test: /(lu\.ma\/|luma\.com\/|partiful\.com\/|eventbrite\.|\b(event|meetup|talk tonight|session|panel|conference|come through)\b)/i },
  { slug: "ask", label: "Ask", test: /(\?\s*$|\banyone (know|have|want)|does anyone|looking for|recommend(ations)?\b)/im },
  { slug: "feedback", label: "Wants feedback", test: /\b(feedback|thoughts on|would love (input|eyes)|draft|rough cut)\b/i },
  { slug: "content", label: "Shared content", test: /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|x\.com\/\w+\/status|substack\.com)/i },
];

const EVENT_LINK = /https?:\/\/(?:www\.)?(?:lu\.ma|luma\.com|partiful\.com|eventbrite\.[a-z.]+)\/[^\s>|]+/gi;
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
// Slack wraps links as <url|label>; unwrap for storage and display.
const clean = (t: string) => t.replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2 ($1)").replace(/<(https?:[^>]+)>/g, "$1");

export async function syncSlack({ days = 30 } = {}) {
  const auth = await slack<{ url: string }>("auth.test", {});
  const base = auth.url.replace(/\/$/, "");

  // 1. Link fellows to Slack users by exact name match (only when unambiguous).
  const users: SlackUser[] = [];
  let cursor: string | undefined;
  do {
    const r: { members: SlackUser[]; response_metadata?: { next_cursor?: string } } = await slack("users.list", { limit: 200, cursor });
    users.push(...r.members.filter((u) => !u.deleted && !u.is_bot));
    cursor = r.response_metadata?.next_cursor || undefined;
  } while (cursor);
  const fellows = await db.fellow.findMany({ select: { id: true, name: true, slackUserId: true } });
  let linked = 0;
  for (const f of fellows.filter((x) => !x.slackUserId)) {
    const hits = users.filter((u) => [u.real_name, u.profile?.real_name, u.profile?.display_name].some((n) => n && norm(n) === norm(f.name)));
    if (hits.length === 1 && !fellows.some((x) => x.slackUserId === hits[0]!.id)) {
      await db.fellow.update({ where: { id: f.id }, data: { slackUserId: hits[0]!.id } });
      f.slackUserId = hits[0]!.id;
      linked++;
    }
  }
  const byUser = new Map(fellows.filter((f) => f.slackUserId).map((f) => [f.slackUserId!, f.id]));

  // 2. Channels the bot is in.
  const channels: { id: string; name: string }[] = [];
  cursor = undefined;
  do {
    const r: { channels: { id: string; name: string; is_member: boolean }[]; response_metadata?: { next_cursor?: string } } = await slack("conversations.list", {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: 200,
      cursor,
    });
    channels.push(...r.channels.filter((c) => c.is_member));
    cursor = r.response_metadata?.next_cursor || undefined;
  } while (cursor);

  // 3. New messages per channel since the last sync (thread replies included).
  let stored = 0;
  let events = 0;
  for (const ch of channels) {
    const key = `slack:${ch.id}`;
    const state = await db.syncState.findUnique({ where: { key } });
    const oldest = state?.value ?? String((Date.now() - days * DAY) / 1000);
    const msgs: SlackMsg[] = [];
    cursor = undefined;
    do {
      const r: { messages: SlackMsg[]; response_metadata?: { next_cursor?: string } } = await slack("conversations.history", { channel: ch.id, oldest, limit: 200, cursor });
      msgs.push(...r.messages);
      cursor = r.response_metadata?.next_cursor || undefined;
    } while (cursor);
    for (const m of msgs.filter((x) => (x.reply_count ?? 0) > 0)) {
      const r = await slack<{ messages: SlackMsg[] }>("conversations.replies", { channel: ch.id, ts: m.ts, oldest, limit: 200 });
      msgs.push(...r.messages.filter((x) => x.ts !== m.ts));
    }
    let newest = oldest;
    for (const m of msgs) {
      if (Number(m.ts) > Number(newest)) newest = m.ts;
      if (!m.text || (m.subtype && m.subtype !== "thread_broadcast")) continue;
      const text = clean(m.text);
      for (const url of text.match(EVENT_LINK) ?? []) {
        const u = url.replace(/[).,]+$/, "");
        const title = text.replace(EVENT_LINK, "").replace(/\s+/g, " ").trim().slice(0, 120) || u;
        await db.resource.upsert({
          where: { externalId: `slack:${u}` },
          create: { externalId: `slack:${u}`, kind: "event", title, url: u, source: "slack", description: `Shared in #${ch.name}`, tags: ["event", "networking"] },
          update: {},
        });
        events++;
      }
      const fellowId = m.user ? byUser.get(m.user) : undefined;
      if (!fellowId) continue;
      const data = {
        channel: ch.name,
        threadTs: m.thread_ts && m.thread_ts !== m.ts ? m.thread_ts : null,
        userId: m.user!,
        fellowId,
        text: text.slice(0, 4000),
        permalink: `${base}/archives/${ch.id}/p${m.ts.replace(".", "")}`,
        replies: m.reply_count ?? 0,
        reactions: (m.reactions ?? []).reduce((a, r) => a + r.count, 0),
        signals: SLACK_SIGNALS.filter((s) => s.test.test(text)).map((s) => s.slug),
        postedAt: new Date(Number(m.ts) * 1000),
      };
      await db.slackMessage.upsert({ where: { channelId_ts: { channelId: ch.id, ts: m.ts } }, create: { channelId: ch.id, ts: m.ts, ...data }, update: data });
      stored++;
    }
    await db.syncState.upsert({ where: { key }, create: { key, value: newest }, update: { value: newest } });
  }
  return { channels: channels.length, users: users.length, linked, stored, events };
}
