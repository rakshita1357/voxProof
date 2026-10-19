"use client";
import { btnSecondary } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="font-semibold text-red-800">Something went wrong</h1>
      <p className="mt-1 text-sm text-red-700">{error.message || "Unexpected error"}{error.digest ? ` (ref ${error.digest})` : ""}</p>
      <button onClick={reset} className={`${btnSecondary} mt-4`}>Try again</button>
    </div>
  );
}
