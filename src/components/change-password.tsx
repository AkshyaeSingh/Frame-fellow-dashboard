"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction } from "@/app/(app)/program-actions";

const inp = "h-8 w-full rounded-md border bg-background px-2 text-sm";

export function ChangePassword() {
  const [msg, action, pending] = useActionState(changeOwnPasswordAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input name="current" type="password" required placeholder="Current password" autoComplete="current-password" className={inp} />
      <input name="next" type="password" required minLength={10} placeholder="New password (10+ characters)" autoComplete="new-password" className={inp} />
      <input name="confirm" type="password" required placeholder="Repeat new password" autoComplete="new-password" className={inp} />
      {msg && <p className={msg === "saved" ? "text-xs text-good" : "text-xs text-bad"}>{msg === "saved" ? "Password changed." : msg}</p>}
      <button disabled={pending} className="h-8 w-full rounded-md border text-sm hover:bg-muted disabled:opacity-50">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
