"use client";
import { btnSecondary } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-fail/30 bg-fail/10 p-6">
      <h1 className="font-semibold text-fail">Something went wrong</h1>
      <p className="mt-1 text-sm text-fail">{error.message || "Unexpected error"}{error.digest ? ` (ref ${error.digest})` : ""}</p>
      <button onClick={reset} className={`${btnSecondary} mt-4`}>Try again</button>
    </div>
  );
}
