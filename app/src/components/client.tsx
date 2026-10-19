"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { btnPrimary } from "./ui";

export function Submit({ children, className = btnPrimary, pendingText = "Working…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2.5 py-1.5 text-sm ${active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-canvas hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}

/** Polls the run API (which advances the pipeline server-side) and refreshes server components. */
export function RunPoller({ runId, active }: { runId: string; active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      await fetch(`/api/runs/${runId}`, { cache: "no-store" }).catch(() => {});
      if (!stop) router.refresh();
    };
    const t = setInterval(tick, 4000);
    tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [runId, active, router]);
  return active ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" role="status">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Live — updating every few seconds
    </span>
  ) : null;
}

export function FormError({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  ) : null;
}
