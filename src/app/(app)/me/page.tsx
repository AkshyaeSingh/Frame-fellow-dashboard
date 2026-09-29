import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MePage() {
  const s = await getSession();
  if (s?.role !== "fellow") redirect(s ? "/fellows" : "/login");
  const f = await db.fellow.findUnique({ where: { id: s.fellowId }, select: { slug: true } });
  if (!f) redirect("/login");
  redirect(`/fellows/${f.slug}`);
}
