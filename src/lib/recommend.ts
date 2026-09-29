import "server-only";
import { db } from "@/lib/db";
import { countBy } from "@/lib/metrics";
import { ORGS, TOPICS, labelOf } from "@/lib/taxonomy";

// Rule-based matching of events/resources to fellows. Transparent on purpose:
// every recommendation carries the reasons it scored.
//
//   +3  a resource tag matches one of the fellow's interests
//   +3  it's about their partner org
//   +2  it matches a topic they actually post about (from tagged content)
//   +1  it fits their format (long / short form)
//   +1  per other fellow with a shared interest who liked or attended it (max 2)
//   +1  Frame program events, and events in the next 3 weeks
// Past events and anything marked "not relevant" are dropped.

const DAY = 86_400_000;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const matches = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y));
};
const orgSlug = (partner: string | null) => (partner ? ORGS.find((o) => matches(o.label, partner) || matches(o.slug, partner))?.slug : undefined);

export async function recommendationsFor(fellowId: string, limit = 12) {
  const now = Date.now();
  const [fellow, resources, peers] = await Promise.all([
    db.fellow.findUniqueOrThrow({
      where: { id: fellowId },
      select: { id: true, interests: true, partnerOrg: true, format: true, cohortId: true, posts: { where: { publishedAt: { gte: new Date(now - 120 * DAY) } }, select: { topics: true } }, resources: true },
    }),
    db.resource.findMany({ orderBy: [{ date: { sort: "asc", nulls: "last" } }] }),
    db.fellow.findMany({ where: { NOT: { id: fellowId } }, select: { interests: true, resources: { where: { status: { in: ["liked", "attended"] } }, select: { resourceId: true } } } }),
  ]);
  const mine = new Map(fellow.resources.map((r) => [r.resourceId, r]));
  const topics = countBy(fellow.posts.map((p) => p.topics))
    .filter(([, n]) => n >= 2)
    .slice(0, 5)
    .map(([t]) => t);
  const org = orgSlug(fellow.partnerOrg);
  const fmt = /long/i.test(fellow.format ?? "") ? "long-form" : /short/i.test(fellow.format ?? "") ? "short-form" : null;
  const peerLikes = new Map<string, number>();
  for (const p of peers) {
    if (!p.interests.some((i) => fellow.interests.some((j) => matches(i, j)))) continue;
    for (const r of p.resources) peerLikes.set(r.resourceId, (peerLikes.get(r.resourceId) ?? 0) + 1);
  }

  const scored = resources
    .filter((r) => {
      const end = (r.endDate ?? r.date)?.getTime();
      if (end != null && end < now - DAY) return false;
      return mine.get(r.id)?.status !== "not-relevant";
    })
    .map((r) => {
      const reasons: string[] = [];
      let score = 0;
      const hitInterests = fellow.interests.filter((i) => r.tags.some((t) => matches(i, t)));
      if (hitInterests.length) {
        score += 3 * Math.min(2, hitInterests.length);
        reasons.push(`your interests: ${hitInterests.slice(0, 3).join(", ")}`);
      }
      if (org && r.tags.includes(org)) {
        score += 3;
        reasons.push(`about ${fellow.partnerOrg}`);
      }
      const hitTopics = topics.filter((t) => r.tags.includes(t));
      if (hitTopics.length) {
        score += 2;
        reasons.push(`you post about ${hitTopics.map((t) => labelOf(TOPICS, t).toLowerCase()).join(", ")}`);
      }
      if (fmt && r.tags.includes(fmt)) {
        score += 1;
        reasons.push(`fits ${fmt}`);
      }
      const peer = Math.min(2, peerLikes.get(r.id) ?? 0);
      if (peer) {
        score += peer;
        reasons.push(`${peerLikes.get(r.id)} fellow${peerLikes.get(r.id)! > 1 ? "s" : ""} with similar interests liked it`);
      }
      if (r.tags.includes("frame")) {
        score += 1;
        reasons.push("Frame program");
      }
      if (r.date && r.date.getTime() - now < 21 * DAY && r.date.getTime() > now - DAY) score += 1;
      const status = mine.get(r.id);
      if (status?.status === "recommended" && status.by === "team") {
        score += 5;
        reasons.unshift("recommended by the Frame team");
      }
      return { resource: r, score, reasons, status: status?.status ?? null };
    })
    .filter((x) => x.score > 0 && !["attended", "liked"].includes(x.status ?? ""))
    .sort((a, b) => b.score - a.score || (a.resource.date?.getTime() ?? Infinity) - (b.resource.date?.getTime() ?? Infinity));
  return scored.slice(0, limit);
}

export async function fellowResources(fellowId: string) {
  return db.fellowResource.findMany({ where: { fellowId }, include: { resource: true }, orderBy: { updatedAt: "desc" } });
}
