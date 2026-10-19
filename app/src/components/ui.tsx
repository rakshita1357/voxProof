import Link from "next/link";
import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

export function PageHeader({ title, crumbs, actions, children }: { title: string; crumbs?: { href: string; label: string }[]; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap gap-1 text-xs text-muted">
            {crumbs.map((c) => (
              <span key={c.href}>
                <Link href={c.href} className="hover:text-ink">{c.label}</Link> /
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const tones: Record<string, string> = {
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  fixed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  fail: "bg-red-50 text-red-700 ring-red-600/20",
  error: "bg-red-50 text-red-700 ring-red-600/20",
  regressed: "bg-red-50 text-red-700 ring-red-600/20",
  critical: "bg-red-600 text-white ring-red-700",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  medium: "bg-amber-50 text-amber-800 ring-amber-600/20",
  low: "bg-slate-50 text-slate-600 ring-slate-500/20",
  running: "bg-accent-soft text-accent ring-accent/20",
  calling: "bg-accent-soft text-accent ring-accent/20",
  evaluating: "bg-accent-soft text-accent ring-accent/20",
  queued: "bg-slate-50 text-slate-600 ring-slate-500/20",
  simulated: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function Chip({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[value] ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>
      {label ?? value.replaceAll("_", " ")}
    </span>
  );
}

export const SeverityChip = ({ s }: { s: Severity }) => <Chip value={s} />;

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50";
export const btnPrimary = `${btn} bg-accent text-white hover:bg-accent/90`;
export const btnSecondary = `${btn} border border-line bg-surface text-ink hover:bg-canvas`;

export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
export const sec = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(2)}s`);
export const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-top";
