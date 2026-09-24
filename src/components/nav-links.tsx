"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" || path.startsWith("/fellows") : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn("shrink-0 rounded-md px-2.5 py-1", active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
