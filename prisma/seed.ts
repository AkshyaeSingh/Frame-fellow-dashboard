// Loads cohorts, fellows and their accounts from data/roster.ts. Safe to re-run:
// existing rows are updated, nothing is deleted.
import { PrismaClient } from "@prisma/client";
import { COHORTS, ROSTER } from "../data/roster";

const db = new PrismaClient();

async function main() {
  for (const c of COHORTS) {
    await db.cohort.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, startDate: new Date(c.startDate), endDate: new Date(c.endDate) },
      update: { name: c.name, startDate: new Date(c.startDate), endDate: new Date(c.endDate) },
    });
  }
  const cohorts = Object.fromEntries((await db.cohort.findMany()).map((c) => [c.slug, c.id]));

  for (const f of ROSTER) {
    const data = {
      name: f.name,
      cohortId: cohorts[f.cohort]!,
      track: f.track ?? null,
      format: f.format ?? null,
      hometown: f.hometown ?? null,
      partnerOrg: f.partnerOrg ?? null,
      status: f.status ?? null,
      email: f.email ?? null,
      plannedOutput: f.plannedOutput ?? null,
    };
    const fellow = await db.fellow.upsert({ where: { slug: f.slug }, create: { slug: f.slug, ...data }, update: data });
    for (const a of f.accounts) {
      await db.account.upsert({
        where: { platform_handle: { platform: a.platform, handle: a.handle.toLowerCase() } },
        create: { fellowId: fellow.id, platform: a.platform, handle: a.handle.toLowerCase(), url: a.url, isPrimary: !!a.primary, note: a.note },
        update: { fellowId: fellow.id, url: a.url, isPrimary: !!a.primary, note: a.note },
      });
    }
  }
  console.log(`Seeded ${COHORTS.length} cohorts, ${ROSTER.length} fellows, ${ROSTER.reduce((s, f) => s + f.accounts.length, 0)} accounts.`);
}

main().finally(() => db.$disconnect());
