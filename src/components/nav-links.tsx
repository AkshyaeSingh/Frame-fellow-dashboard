"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

// Fellow pages belong to Home for the team; everything else matches by prefix.
const isActive = (path: string, href: string) => (href === "/" ? path === "/" || path.startsWith("/fellows/") : path === href || path.startsWith(`${href}/`));

export function NavLinks({ items, more = [] }: { items: Item[]; more?: Item[] }) {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);
  const link = (i: Item) => (
    <Link key={i.href} href={i.href} className={cn("shrink-0 rounded-md px-2.5 py-1", isActive(path, i.href) ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
      {i.label}
    </Link>
  );
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map(link)}
      {more.length > 0 && (
        <details ref={menu} className="relative">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-0.5 rounded-md px-2.5 py-1 [&::-webkit-details-marker]:hidden",
              more.some((i) => isActive(path, i.href)) ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            More <ChevronDown className="size-3.5" />
          </summary>
          <div className="absolute top-full left-0 z-40 mt-1 grid min-w-40 rounded-lg border bg-popover p-1 shadow-md">
            {more.map((i) => (
              <Link key={i.href} href={i.href} className={cn("rounded px-2.5 py-1.5", isActive(path, i.href) ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {i.label}
              </Link>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
