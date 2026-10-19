"use client";
import { useActionState } from "react";
import { FormError, Submit } from "@/components/client";
import { login } from "@/lib/actions";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-6">
        <div>
          <h1 className="text-lg font-semibold">VoxProof</h1>
          <p className="text-sm text-muted">Test the conversation before your customers do.</p>
        </div>
        <div>
          <label htmlFor="password" className="label">Workspace password</label>
          <input id="password" name="password" type="password" required autoFocus className="input" autoComplete="current-password" />
        </div>
        <FormError error={state?.error} />
        <Submit className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">Sign in</Submit>
      </form>
    </main>
  );
}
