// Imports fellow form responses (Google Forms CSV exports) into FormResponse,
// keeping only questions relevant to impact. Personal/sensitive fields
// (phone, birthday, emergency contacts, health/accessibility, sizes, food,
// housing logistics) are dropped at import and never stored.
//
//   npm run import:forms -- [dir]      (defaults to ~/Downloads)
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { ROSTER } from "../data/roster";

const db = new PrismaClient();
const dir = process.argv[2] ?? path.join(homedir(), "Downloads");

type Answer = { q: string; a: string; group: string };

// Questions matching any of these are never imported.
const EXCLUDE = [
  /timestamp/i, /^username$/i, /^full name$/i, /^name$/i, /preferred name/i, /birthday/i, /driver/i, /best email/i, /phone/i,
  /headshot/i, /emergency/i, /insurance/i, /accessibility/i, /allerg/i, /dietary/i, /t.?shirt/i, /hoodie/i, /housing/i,
  /arrive in sf/i, /scheduled conflicts/i, /fun fact/i, /hidden talent/i, /for fun/i, /personal circumstances/i,
];

// First matching rule decides the group. "private" answers are hidden in the funder view.
const GROUPS: [RegExp, string][] = [
  [/if you hadn.t joined|couldn.?t have happened|more valuable than just receiving a grant/i, "counterfactual"],
  [/your conditions|transition into full-time|monthly income|sustainab|revenue|financial|pay 10.20%|dream creator agency|anything else you.d like us to know/i, "private"],
  [/how proud|how excited|how clear do you feel|percentage change in your content|confident do you feel in negotiating|match what you expected/i, "self-rating"],
  [/achieve|goals|set out to figure out|successful fellowship|6 months - 1 year|where you were in your content journey/i, "goals"],
  [/channel metrics|content journey|primary content platform|how many content pieces|type of content you made|followers|average views|pieces of content|hours per week|content cadence|time have you given|highest output/i, "baseline"],
  [/audience|demographic/i, "audience"],
  [/call.to.action|cta/i, "cta"],
  [/craft|packaging|substance|business & operations|operations : building|skills/i, "skills"],
  [/ai safety topics|ai safety course|sources do you currently follow|funders about the importance/i, "ai-safety"],
  [/proud of|flopped|flop|best performing|standout moments|press|sponsorships, collaborations|connections|meaningful impact/i, "outcomes"],
  [/testimonial/i, "testimonial"],
  [/beneficial|program director|vision|extended support|ongoing support|mentor/i, "program-feedback"],
  [/content ideas|want to make during/i, "plans"],
  [/process|measure whether|working well|bottleneck|equipment|software|outsource|flow|experiment|collaborate|failure modes|working style/i, "process"],
];

function groupOf(q: string) {
  for (const [re, g] of GROUPS) if (re.test(q)) return g;
  return "other";
}

function read(file: string) {
  const p = path.join(dir, file);
  if (!existsSync(p)) {
    console.warn(`skip: ${file} not found in ${dir}`);
    return null;
  }
  return parse(readFileSync(p, "utf8").replace(/^﻿/, ""), { columns: true, skip_empty_lines: true, relax_quotes: true }) as Record<string, string>[];
}

const clean = (q: string) => q.replace(/\s+/g, " ").trim();

function answersOf(row: Record<string, string>): Answer[] {
  return Object.entries(row)
    .filter(([q, a]) => a?.trim() && !EXCLUDE.some((re) => re.test(clean(q))))
    .map(([q, a]) => ({ q: clean(q), a: a.trim(), group: groupOf(q) }));
}

function parseDate(s?: string) {
  if (!s) return null;
  const d = new Date(s.replace(/ (AM|PM) \w+$/, " $1"));
  return isNaN(d.getTime()) ? null : d;
}

async function findFellow(email?: string, name?: string) {
  const e = email?.trim().toLowerCase();
  const n = name?.trim().toLowerCase();
  const seed = ROSTER.find(
    (f) =>
      (e && f.email?.toLowerCase() === e) ||
      (n && (f.name.toLowerCase() === n || f.formNames?.some((x) => x.toLowerCase() === n))),
  );
  return seed ? db.fellow.findUnique({ where: { slug: seed.slug } }) : null;
}

async function importPerFellow(file: string, form: string, nameCol: string) {
  const rows = read(file);
  if (!rows) return;
  let n = 0;
  for (const row of rows) {
    const fellow = await findFellow(row["Username"], row[nameCol]);
    if (!fellow) {
      console.warn(`  ${form}: no fellow for "${row[nameCol]}" — add to data/roster.ts formNames`);
      continue;
    }
    const answers = answersOf(row);
    const submittedAt = parseDate(row["Timestamp"]);
    await db.formResponse.upsert({
      where: { fellowId_form: { fellowId: fellow.id, form } },
      create: { fellowId: fellow.id, form, submittedAt, answers },
      update: { submittedAt, answers },
    });

    // Lift a few answers onto the fellow record for quick access.
    const pick = (re: RegExp) => answers.find((x) => re.test(x.q))?.a;
    const goals = pick(/3 specific things you hope to achieve|successful fellowship/i);
    const counterfactual = pick(/if you hadn.t joined frame/i) ?? pick(/couldn.?t have happened/i);
    await db.fellow.update({
      where: { id: fellow.id },
      data: { ...(goals && !fellow.goals && { goals }), ...(counterfactual && { counterfactual }) },
    });

    // Exit-survey "standout moments" become unassessed outcomes for the team to attribute.
    if (form === "exit-survey") {
      const standout = pick(/standout moments/i);
      if (standout && !/^(no|n\/a|none)\.?$/i.test(standout)) {
        const exists = await db.outcome.findFirst({ where: { fellowId: fellow.id, source: "exit-survey", type: "other", title: "Standout moments (self-reported)" } });
        if (!exists)
          await db.outcome.create({
            data: { fellowId: fellow.id, date: submittedAt, type: "other", title: "Standout moments (self-reported)", detail: standout, source: "exit-survey", attribution: "unknown" },
          });
      }
    }
    n++;
  }
  console.log(`${form}: ${n}/${rows.length} imported`);
}

async function importAnonymous(file: string, cohortSlug: string, form: string) {
  const rows = read(file);
  if (!rows) return;
  await db.cohortSurvey.deleteMany({ where: { cohortSlug, form } });
  for (const row of rows) {
    await db.cohortSurvey.create({ data: { cohortSlug, form, submittedAt: parseDate(row["Timestamp"]), answers: answersOf(row) } });
  }
  console.log(`${form} (anonymous, cohort-level): ${rows.length} imported`);
}

async function main() {
  await importPerFellow("The Frame Fellows pre-questionnaire.csv", "pre-questionnaire", "Name");
  await importPerFellow("Frame Fellowship Cohort 2- Onboarding Form.csv", "onboarding", "Full name");
  await importPerFellow("Frame Creator Fellowship Exit Survey.csv", "exit-survey", "Full Name");
  await importAnonymous("anonymous Frame Exit Survey.csv", "cohort-1", "anonymous-exit");
}

main().finally(() => db.$disconnect());
