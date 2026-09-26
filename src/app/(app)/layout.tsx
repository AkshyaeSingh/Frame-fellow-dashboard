import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const role = await requireRole();
  const nav = [
    { href: "/", label: "Overview" },
    { href: "/content", label: "Content" },
    { href: "/outliers", label: "Outliers" },
    { href: "/methodology", label: "Methodology" },
    ...(role === "team" ? [{ href: "/data", label: "Data & scraping" }] : []),
  ];
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold whitespace-nowrap">
            Frame · Fellow Impact
          </Link>
          <NavLinks items={nav} />
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wide">{role === "team" ? "Team" : "Funder view"}</span>
            <span className="hidden sm:inline">Internal · do not share</span>
            <form action={logoutAction}>
              <button className="hover:text-foreground">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </>
  );
}
