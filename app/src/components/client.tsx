"use client";
import { Activity, LayoutDashboard, ListChecks, PhoneCall, type LucideIcon } from "lucide-react";
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

const NAV_ICONS: Record<string, LucideIcon> = { "/": LayoutDashboard, "/agents": PhoneCall, "/scenarios": ListChecks, "/runs": Activity };

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  const Icon = NAV_ICONS[href];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${active ? "bg-white/[0.07] font-medium text-ink" : "text-muted hover:bg-white/[0.04] hover:text-ink"}`}
    >
      {Icon && <Icon size={15} aria-hidden className={active ? "text-accent-fg" : ""} />}
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
    <p role="alert" className="rounded-md border border-fail/30 bg-fail/10 px-3 py-2 text-sm text-fail">
      {error}
    </p>
  ) : null;
}
