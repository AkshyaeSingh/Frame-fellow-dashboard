import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getFellow } from "@/lib/data";
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

export async function generateMetadata(props: PageProps<"/fellows/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const f = await getFellow(slug);
  return { title: f?.name ?? "Fellow" };
}

const TABS = [
  { key: "overview", label: "Impact" },
  { key: "content", label: "Content" },
  { key: "messaging", label: "Messaging & CTAs" },
  { key: "audience", label: "Audience response" },
  { key: "trudy", label: "Partner fit (Trudy)" },
  { key: "forms", label: "Forms & self-reports" },
  { key: "context", label: "Context & meetings", teamOnly: true },
] as const;

export default async function FellowPage(props: PageProps<"/fellows/[slug]">) {
  const role = await requireRole();
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const f = await getFellow(slug);
  if (!f) notFound();
  const isTeam = role === "team";
  const tabs = TABS.filter((t) => isTeam || !("teamOnly" in t));
  const tab = tabs.find((t) => t.key === sp.tab)?.key ?? "overview";
  const cmp = compareWindows(f.posts as PostLike[], f.cohort.startDate, f.cohort.endDate);

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Portfolio
      </Link>

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
          {!f.accounts.length && <span className="text-xs text-muted-foreground">No handles yet{isTeam && " — add them on the Data page"}</span>}
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? `/fellows/${f.slug}` : `/fellows/${f.slug}?tab=${t.key}`}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {t.key === "trudy" && f.trudy.length > 0 && <span className="ml-1 text-xs text-muted-foreground">{f.trudy.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab f={f} cmp={cmp} isTeam={isTeam} />}
      {tab === "content" && <ContentTab f={f} sp={sp} />}
      {tab === "messaging" && <MessagingTab f={f} />}
      {tab === "trudy" && <TrudyTab f={f} isTeam={isTeam} />}
      {tab === "forms" && <FormsTab f={f} isTeam={isTeam} />}
      {tab === "audience" && <AudienceTab fellowId={f.id} />}
      {tab === "context" && isTeam && <ContextTab fellowId={f.id} />}
    </div>
  );
}
