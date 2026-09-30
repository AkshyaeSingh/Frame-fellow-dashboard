"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

const input = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-medium">
        Username
        <input name="username" required autoFocus autoComplete="username" autoCapitalize="none" placeholder="Your first name" className={input} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button disabled={pending} className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/85 disabled:opacity-50">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
