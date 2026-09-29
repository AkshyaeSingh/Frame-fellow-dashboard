"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function CopyLink({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {done ? <Check className="size-3 text-good" /> : <Link2 className="size-3" />}
      {done ? "Copied" : label}
    </button>
  );
}
