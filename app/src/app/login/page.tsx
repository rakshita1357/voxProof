"use client";
import { useActionState } from "react";
import { FormError, Submit } from "@/components/client";
import { Logo, Waveform, btnPrimary } from "@/components/ui";
import { login } from "@/lib/actions";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-[#0b0c0d] p-12 text-white lg:flex">
        <Logo light />
        <div className="max-w-md">
          <h1 className="text-[40px] font-semibold leading-[1.08] tracking-[-0.035em]">
            Test the conversation before your customers do.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            VoxProof places real test calls through your Gnani agent, scores every turn, and tells you what to change.
          </p>
        </div>

        <div className="space-y-4">
          <div className="h-20 text-accent-fg/60">
            <Waveform bars={72} animate />
          </div>
          <div className="max-w-sm rounded-xl border border-white/10 bg-navy-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Slow response
              </span>
              <span className="font-mono text-xs text-white/40">00:41.2</span>
            </div>
            <p className="mt-3 text-white/80">“How much is my due amount?”</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-warn" />
            </div>
            <p className="mt-2 text-xs text-white/50">Agent answered after 3.6s. The scenario allows 2.5s.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <form action={action} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted">Enter the workspace password set in <code className="font-mono text-[13px]">APP_PASSWORD</code>.</p>
          <div className="mt-8">
            <label htmlFor="password" className="label">Workspace password</label>
            <input id="password" name="password" type="password" required autoFocus className="input py-2.5" autoComplete="current-password" />
          </div>
          <div className="mt-4"><FormError error={state?.error} /></div>
          <Submit className={`${btnPrimary} mt-4 w-full py-2.5`} pendingText="Signing in…">Sign in</Submit>
        </form>
      </section>
    </main>
  );
}
