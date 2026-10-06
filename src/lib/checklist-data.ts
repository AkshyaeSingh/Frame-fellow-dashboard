import "server-only";
import { db } from "@/lib/db";
import { defaultItemsFor } from "@/lib/checklist";

// Creates the default checklist for a fellow the first time it's needed.
export async function ensureChecklist(fellowIds: string[]) {
  const have = new Set((await db.fellowGoal.groupBy({ by: ["fellowId"], where: { fellowId: { in: fellowIds } } })).map((g) => g.fellowId));
  const missing = fellowIds.filter((id) => !have.has(id));
  if (!missing.length) return;
  const fellows = await db.fellow.findMany({ where: { id: { in: missing } }, select: { id: true, track: true, partnerOrg: true } });
  await db.fellowGoal.createMany({
    data: fellows.flatMap((f) => defaultItemsFor(f).map((i) => ({ fellowId: f.id, key: i.key, title: i.title, area: i.area, order: i.order }))),
    skipDuplicates: true,
  });
}

export async function checklistsFor(fellowIds: string[]) {
  await ensureChecklist(fellowIds);
  const goals = await db.fellowGoal.findMany({ where: { fellowId: { in: fellowIds } }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  const by = new Map<string, typeof goals>();
  for (const g of goals) by.set(g.fellowId, [...(by.get(g.fellowId) ?? []), g]);
  return by;
}
