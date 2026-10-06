import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFellow } from "@/lib/data";
import { db } from "@/lib/db";
import { compact, relativeDate, shortDate } from "@/lib/format";
import { compareWindows, type PostLike } from "@/lib/metrics";
import { PLATFORM_LABEL } from "@/lib/taxonomy";
import { CreatorAvatar } from "@/components/creator-avatar";
import { PlatformIcon } from "@/components/platform-icon";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./overview-tab";
import { ContentTab } from "./content-tab";
import { MessagingTab } from "./messaging-tab";
import { TrudyTab } from "./trudy-tab";
import { FormsTab } from "./forms-tab";
import { AudienceTab } from "./audience-tab";
import { ContextTab } from "./context-tab";
import { ProfileOverview } from "./profile-overview";
import { OpportunitiesTab } from "./opportunities-tab";

export async function generateMetadata(props: PageProps<"/fellows/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const f = await getFellow(slug);
  return { title: f?.name ?? "Fellow" };
}

// Four tabs. who: team sees everything; funders get the impact view and
// content; a fellow sees their own content here (their home is /me) or a
// cohort-mate's posts ("peer").
const TABS = [
  { key: "overview", label: "Overview", who: ["team", "funder"] },
  { key: "content", label: "Content", who: ["team", "funder", "self", "peer"] },
  { key: "notes", label: "Notes", who: ["team"] },
  { key: "forms", label: "Self-reports", who: ["funder"] },
  { key: "opportunities", label: "Opportunities", who: ["team"] },
] as const;

// Content sub-views (posts are the default).
const CONTENT_VIEWS = [
  { key: "posts", label: "Posts" },
  { key: "audience", label: "Audience response" },
  { key: "messaging", label: "Messaging & CTAs" },
] as const;

export default async function FellowPage(props: PageProps<"/fellows/[slug]">) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const f = await getFellow(slug);
  if (!f) notFound();
  const isTeam = session.role === "team";
  const isSelf = session.role === "fellow" && session.fellowId === f.id;
  const viewer: "team" | "funder" | "self" | "peer" = session.role === "fellow" ? (isSelf ? "self" : "peer") : session.role;
  if (viewer === "peer") {
    // Fellows can look at the content of fellows in their own cohort only.
    const me = await db.fellow.findUnique({ where: { id: session.fellowId }, select: { cohortId: true } });
    if (me?.cohortId !== f.cohortId) redirect("/me");
  }
  const LEGACY: Record<string, string> = { plan: "overview", audience: "content", messaging: "content", context: "notes", trudy: "notes", forms: viewer === "funder" ? "forms" : "notes" };
  const asked = typeof sp.tab === "string" ? (LEGACY[sp.tab] ?? sp.tab) : undefined;
  const tabs = TABS.filter((t) => (t.who as readonly string[]).includes(viewer));
  const tab = tabs.find((t) => t.key === asked)?.key ?? tabs[0]!.key;
  const view = CONTENT_VIEWS.find((v) => v.key === (sp.view ?? (sp.tab === "audience" || sp.tab === "messaging" ? sp.tab : undefined)))?.key ?? "posts";
  const views = viewer === "peer" ? [] : CONTENT_VIEWS.filter((v) => v.key !== "messaging" || viewer !== "self");
  const cmp = compareWindows(f.posts as PostLike[], f.cohort.startDate, f.cohort.endDate);

  return (
    <div className="space-y-6">
      {viewer === "self" ? (
        <Link href="/me" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> My week
        </Link>
      ) : (
        <Link href={viewer === "peer" ? "/cohort" : isTeam ? "/" : "/impact"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {viewer === "peer" ? "Cohort" : isTeam ? "Home" : "Impact report"}
        </Link>
      )}

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <CreatorAvatar name={f.name} src={f.accounts.find((a) => a.avatarUrl)?.avatarUrl} className="size-14 text-base" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{f.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[f.cohort.name, f.track && `${f.track} track`, f.format, f.hometown].filter(Boolean).join(" · ")}
            </p>
            {f.partnerOrg && <p className="mt-1 text-sm">Paired with <span className="font-medium">{f.partnerOrg}</span></p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Fellowship {shortDate(f.cohort.startDate)} – {shortDate(f.cohort.endDate)}
            </p>
          </div>
        </div>
        <div className="flex max-w-xl flex-wrap justify-end gap-2">
          {f.accounts.map((a) => {
            const last = a.snapshots.filter((s) => s.followers != null).at(-1);
            return (
              <a
                key={a.id}
                href={a.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs hover:border-foreground/30"
                title={`${PLATFORM_LABEL[a.platform]}${a.note ? ` · ${a.note}` : ""} · last scraped ${relativeDate(a.lastScrapedAt)}`}
              >
                <PlatformIcon platform={a.platform} className="size-3" />
                <span className="font-medium">{a.handle}</span>
                {last?.followers != null && <span className="text-muted-foreground">{compact(last.followers)}</span>}
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            );
          })}
          {!f.accounts.length && <span className="text-xs text-muted-foreground">No handles yet{isTeam ? ", add them in Overview → Accounts" : isSelf ? ". Add them on My week" : ""}</span>}
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === tabs[0]!.key ? `/fellows/${f.slug}` : `/fellows/${f.slug}?tab=${t.key}`}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            
          </Link>
        ))}
      </nav>

      {tab === "overview" &&
        (isTeam ? (
          <ProfileOverview f={f} cmp={cmp} />
        ) : (
          <OverviewTab f={f} cmp={cmp} isTeam={false} />
        ))}
      {tab === "content" && (
        <div className="space-y-4">
          {views.length > 1 && (
            <div className="flex w-fit rounded-md border p-0.5 text-xs">
              {views.map((v) => (
                <Link
                  key={v.key}
                  href={`/fellows/${f.slug}?tab=content${v.key === "posts" ? "" : `&view=${v.key}`}`}
                  className={cn("rounded px-2.5 py-1", view === v.key ? "bg-muted font-medium" : "text-muted-foreground")}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          )}
          {view === "posts" && <ContentTab f={f} sp={sp} />}
          {view === "audience" && <AudienceTab fellowId={f.id} />}
          {view === "messaging" && <MessagingTab f={f} />}
        </div>
      )}
      {tab === "notes" && isTeam && (
        <div className="space-y-6">
          <ContextTab fellowId={f.id} />
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Forms & self-reports</summary>
            <div className="border-t p-4">
              <FormsTab f={f} isTeam />
            </div>
          </details>
          <details className="rounded-lg border" open={f.trudy.length > 0 && sp.tab === "trudy"}>
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Partner fit (Trudy){f.trudy.length > 0 && <span className="ml-1 text-muted-foreground">· {f.trudy.length}</span>}</summary>
            <div className="border-t p-4">
              <TrudyTab f={f} isTeam />
            </div>
          </details>
        </div>
      )}
      {tab === "forms" && <FormsTab f={f} isTeam={false} />}
      {tab === "opportunities" && <OpportunitiesTab fellowId={f.id} isTeam canEdit />}
    </div>
  );
}
