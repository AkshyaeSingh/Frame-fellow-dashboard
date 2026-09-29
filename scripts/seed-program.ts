// Fills empty program-management fields for cohort 2 from data/program-seed.ts
// and upserts the starting list of events/resources. Safe to re-run.
import { PrismaClient } from "@prisma/client";
import { PLANS, RESOURCES } from "../data/program-seed";

const db = new PrismaClient();

async function main() {
  for (const [slug, plan] of Object.entries(PLANS)) {
    const f = await db.fellow.findUnique({ where: { slug } });
    if (!f) continue;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(plan)) {
      const cur = f[k as keyof typeof f];
      if (cur == null || (Array.isArray(cur) && !cur.length)) data[k] = v;
    }
    if (Object.keys(data).length) await db.fellow.update({ where: { id: f.id }, data });
  }
  for (const r of RESOURCES) {
    const { key, date, endDate, ...rest } = r;
    const data = { ...rest, date: date ? new Date(date) : null, endDate: endDate ? new Date(endDate) : null, source: "granola" };
    await db.resource.upsert({ where: { externalId: `seed:${key}` }, create: { externalId: `seed:${key}`, ...data }, update: data });
  }
  console.log(`plans: ${Object.keys(PLANS).length}, resources: ${RESOURCES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
