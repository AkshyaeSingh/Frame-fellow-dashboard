"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = ["#52525b", "#57534e", "#475569", "#4b5563", "#44403c", "#3f3f46"];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function CreatorAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn("size-12 shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white",
        className,
      )}
      style={{ backgroundColor: PALETTE[hash(name) % PALETTE.length] }}
    >
      {initials(name)}
    </div>
  );
}

// Placeholder art for content without a thumbnail.
export function ThumbPlaceholder({ seed, className }: { seed: string; className?: string }) {
  const a = PALETTE[hash(seed) % PALETTE.length];
  const b = PALETTE[(hash(seed) + 2) % PALETTE.length];
  return (
    <div
      aria-hidden
      className={cn("h-full w-full", className)}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    />
  );
}
