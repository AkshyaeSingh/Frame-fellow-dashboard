"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

// Generates a fellow's password and shows it once, with a ready-to-send message.
export function PasswordReveal({ hasPassword, generate }: { hasPassword: boolean; generate: () => Promise<{ username: string; password: string }> }) {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  if (creds) {
    const msg = `Your Frame dashboard: ${window.location.origin}/login\nUsername: ${creds.username}\nPassword: ${creds.password}\nYou can change your password on the Plan & cadence tab.`;
    return (
      <div className="rounded-md border bg-muted/50 p-2 text-xs">
        <p>
          <span className="text-muted-foreground">Username</span> <span className="font-mono">{creds.username}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Password</span> <span className="font-mono">{creds.password}</span>
        </p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(msg);
            setCopied(true);
          }}
          className="mt-1 inline-flex items-center gap-1 text-foreground hover:underline"
        >
          {copied ? <Check className="size-3 text-good" /> : <Copy className="size-3" />} {copied ? "Copied message" : "Copy message to send"}
        </button>
        <p className="mt-1 text-[11px] text-muted-foreground">Shown once. Only a hash is stored.</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (hasPassword && !confirm("Replace the current password? The fellow will be signed out everywhere.")) return;
        start(async () => setCreds(await generate()));
      }}
      className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
    >
      <KeyRound className="size-3" />
      {pending ? "Generating…" : hasPassword ? "Reset password" : "Create password"}
    </button>
  );
}
