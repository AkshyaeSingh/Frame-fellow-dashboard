import type { FellowFull } from "@/lib/data";
import { shortDate } from "@/lib/format";
import { Empty, SectionTitle } from "@/components/bits";
import { saveNotesAction } from "../../team-actions";

const FORM_LABEL: Record<string, string> = { "pre-questionnaire": "Pre-fellowship questionnaire", onboarding: "Onboarding form", "exit-survey": "Exit survey" };
const GROUP_ORDER = ["counterfactual", "outcomes", "self-rating", "goals", "baseline", "audience", "cta", "ai-safety", "plans", "process", "skills", "program-feedback", "testimonial", "other", "private"];
const GROUP_LABEL: Record<string, string> = {
  counterfactual: "Counterfactual",
  outcomes: "Outcomes & highlights",
  "self-rating": "Self-ratings",
  goals: "Goals",
  baseline: "Baseline & output",
  audience: "Audience",
  cta: "Calls to action",
  "ai-safety": "AI safety understanding",
  plans: "Content plans",
  process: "Process",
  skills: "Skills self-assessment",
  "program-feedback": "Program feedback",
  testimonial: "Testimonial",
  other: "Other",
  private: "Private (team only)",
};

type Answer = { q: string; a: string; group: string };

export function FormsTab({ f, isTeam }: { f: FellowFull; isTeam: boolean }) {
  const forms = [...f.responses].sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
  return (
    <div className="space-y-6">
      {isTeam && (
        <form action={saveNotesAction.bind(null, f.id)} className="rounded-lg border bg-card p-4">
          <SectionTitle hint="Team only — not shown in the funder view.">Team notes</SectionTitle>
          <textarea name="notes" defaultValue={f.notes ?? ""} className="min-h-20 w-full rounded-md border bg-background px-2 py-1 text-sm" />
          <button className="mt-2 h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground">Save notes</button>
        </form>
      )}
      {!forms.length && <Empty>No form responses linked to {f.name}.</Empty>}
      {forms.map((r) => {
        const answers = (r.answers as Answer[]).filter((a) => isTeam || a.group !== "private");
        const groups = GROUP_ORDER.map((g) => [g, answers.filter((a) => a.group === g)] as const).filter(([, as]) => as.length);
        return (
          <section key={r.id} className="rounded-lg border bg-card">
            <header className="border-b px-4 py-2.5">
              <h2 className="text-sm font-semibold">{FORM_LABEL[r.form] ?? r.form}</h2>
              <p className="text-xs text-muted-foreground">Submitted {r.submittedAt ? shortDate(r.submittedAt) : "—"}</p>
            </header>
            <div className="divide-y">
              {groups.map(([g, as]) => (
                <details key={g} open={["counterfactual", "outcomes", "self-rating"].includes(g)} className="px-4 py-2">
                  <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABEL[g] ?? g} <span className="normal-case">({as.length})</span>
                  </summary>
                  <dl className="mt-2 space-y-3">
                    {as.map((a) => (
                      <div key={a.q}>
                        <dt className="text-xs text-muted-foreground">{a.q}</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-sm">{a.a}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
