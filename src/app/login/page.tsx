import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { devLoginAction } from "@/app/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6">
        <p className="text-sm font-semibold">Frame · Fellow Impact</p>
        <p className="mt-1 mb-5 text-xs text-muted-foreground">Fellows: your first name and the password the Frame team gave you. Team: admin.</p>
        <LoginForm next={next} />
        {process.env.NODE_ENV === "development" && (
          <form action={devLoginAction} className="mt-3 flex gap-2">
            <button name="role" value="team" className="h-8 flex-1 rounded-md border text-xs hover:bg-muted">
              Dev: team
            </button>
            <button name="role" value="funder" className="h-8 flex-1 rounded-md border text-xs hover:bg-muted">
              Dev: funder view
            </button>
            <button name="role" value="fellow:reuben-adams" className="h-8 flex-1 rounded-md border text-xs hover:bg-muted">
              Dev: fellow
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
