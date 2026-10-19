import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Persona, Scenario, Severity, TestCase } from "@/lib/types";

export function PageHeader({ title, crumbs, actions, children }: { title: string; crumbs?: { href: string; label: string }[]; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {crumbs.map((c) => (
              <span key={c.href} className="flex items-center gap-1.5">
                <Link href={c.href} className="hover:text-ink">{c.label}</Link>
                <span aria-hidden className="text-muted/50">/</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        {children && <div className="mt-1.5 max-w-2xl text-[13px] text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, children, className = "", actions, flush }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode; flush?: boolean }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-line bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
          <h2 className="text-[13px] font-medium text-ink">{title}</h2>
          {actions}
        </div>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

const tones: Record<string, [string, string]> = {
  passed: ["bg-pass/12 text-pass", "bg-pass"],
  pass: ["bg-pass/12 text-pass", "bg-pass"],
  connected: ["bg-pass/12 text-pass", "bg-pass"],
  completed: ["bg-pass/12 text-pass", "bg-pass"],
  fixed: ["bg-pass/12 text-pass", "bg-pass"],
  failed: ["bg-fail/12 text-fail", "bg-fail"],
  fail: ["bg-fail/12 text-fail", "bg-fail"],
  error: ["bg-fail/12 text-fail", "bg-fail"],
  regressed: ["bg-fail/12 text-fail", "bg-fail"],
  critical: ["bg-fail/20 text-[#ff8a8a] ring-1 ring-inset ring-fail/40", "bg-fail"],
  high: ["bg-warn/12 text-warn", "bg-warn"],
  medium: ["bg-caution/12 text-caution", "bg-caution"],
  low: ["bg-white/[0.06] text-muted", "bg-muted/70"],
  running: ["bg-accent-soft text-accent-fg", "bg-accent-fg animate-pulse"],
  calling: ["bg-accent-soft text-accent-fg", "bg-accent-fg animate-pulse"],
  evaluating: ["bg-accent-soft text-accent-fg", "bg-accent-fg animate-pulse"],
  queued: ["bg-white/[0.06] text-muted", "bg-muted/70"],
  simulated: ["bg-accent/15 text-accent-fg", "bg-accent"],
};

export function Chip({ value, label }: { value: string; label?: string }) {
  const [cls, dot] = tones[value] ?? ["bg-white/[0.06] text-muted", "bg-muted/70"];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label ?? value.replaceAll("_", " ")}
    </span>
  );
}

export const SeverityChip = ({ s }: { s: Severity }) => <Chip value={s} />;

export function Empty({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[10px] border border-dashed border-line bg-surface px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-accent-fg">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "pass" | "fail" }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.02em] ${tone === "pass" ? "text-pass" : tone === "fail" ? "text-fail" : ""}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const btn = "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition active:scale-[0.98] disabled:opacity-50";
export const btnPrimary = `${btn} bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#6c78e0]`;
export const btnSecondary = `${btn} border border-line bg-surface-2 text-ink hover:border-white/15 hover:bg-[#1d1e21]`;

export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
export const sec = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(2)}s`);
export const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="border-b border-line text-xs text-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr]:transition-colors [&>tr:hover]:bg-white/[0.02]">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-top";

/** Decorative call waveform. Bar heights are deterministic so server and client agree. */
export function Waveform({ bars = 48, className = "", animate = false }: { bars?: number; className?: string; animate?: boolean }) {
  return (
    <div aria-hidden className={`flex h-full items-center gap-[3px] ${className}`}>
      {Array.from({ length: bars }, (_, i) => {
        const h = 18 + Math.abs(Math.sin(i * 0.9) * 52 + Math.sin(i * 0.37) * 30);
        return (
          <span
            key={i}
            className={`w-[3px] shrink-0 rounded-full bg-current ${animate ? "vp-bar" : ""}`}
            style={{ height: `${Math.min(100, h)}%`, animationDelay: animate ? `${(i % 12) * 0.09}s` : undefined }}
          />
        );
      })}
    </div>
  );
}

const cellTone: Record<string, string> = {
  passed: "bg-pass",
  failed: "bg-fail",
  error: "bg-fail/50",
  insufficient_data: "bg-caution",
  calling: "bg-accent animate-pulse",
  evaluating: "bg-accent/60 animate-pulse",
  queued: "bg-white/[0.08]",
  cancelled: "bg-muted/40",
};

/** Scenario × persona grid; each square is one call. The fastest read of a run's health. */
export function TestMatrix({ runId, scenarios, personas, cases, compact }: { runId: string; scenarios: Scenario[]; personas: Persona[]; cases: TestCase[]; compact?: boolean }) {
  const size = compact ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            <th className="sr-only">Scenario</th>
            {personas.map((p) => (
              <th key={p.id} scope="col" className="px-1.5 pb-2 text-left align-bottom text-xs font-medium text-muted">
                <span className={`flex flex-col items-start gap-1.5 ${compact ? "w-[4.5rem]" : "w-32"}`} title={p.name}>
                  <Avatar id={p.id} name={p.name} size={compact ? 22 : 26} />
                  <span className="block w-full leading-tight">{p.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.id}>
              <th scope="row" className={`py-1 pr-4 text-left font-normal ${compact ? "max-w-40" : "max-w-64"}`}>
                <span className="block truncate" title={s.title}>{s.title}</span>
              </th>
              {personas.map((p) => (
                <td key={p.id} className="px-1.5 py-1">
                  <div className="flex gap-1">
                    {cases
                      .filter((c) => c.scenarioId === s.id && c.personaId === p.id)
                      .map((c) => (
                        <Link
                          key={c.id}
                          href={`/runs/${runId}/cases/${c.id}`}
                          title={`${s.title} / ${p.name}: ${c.status.replace("_", " ")}`}
                          aria-label={`${s.title}, ${p.name}, sample ${c.sample + 1}: ${c.status.replace("_", " ")}`}
                          className={`${size} rounded-[4px] ${cellTone[c.status] ?? "bg-line"} ring-accent-fg ring-offset-2 ring-offset-surface transition hover:ring-2`}
                        />
                      ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {[["passed", "Passed"], ["failed", "Failed"], ["insufficient_data", "Not enough data"], ["error", "Error"], ["calling", "In progress"], ["queued", "Queued"]].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[3px] ${cellTone[k]}`} />{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="" width={163} height={186} priority className="h-9 w-auto drop-shadow-sm" />
      <span className={`text-[17px] font-semibold tracking-[-0.02em] ${light ? "text-white" : "text-ink"}`}>VoxProof</span>
    </span>
  );
}

/** Same finding across several calls (e.g. one fault hit by 4 personas) is shown once with a count. */
export function groupFindings<T extends { title: string; scenarioId: string; severity: Severity }>(items: T[]) {
  const groups = new Map<string, { f: T; count: number }>();
  for (const f of items) {
    const k = `${f.scenarioId}|${f.title}`;
    const g = groups.get(k);
    if (g) g.count++;
    else groups.set(k, { f, count: 1 });
  }
  return [...groups.values()];
}

export const Count = ({ n }: { n: number }) =>
  n > 1 ? <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-muted">{n} calls</span> : null;

// Persona identity colours: categorical, fixed order so a persona keeps its colour everywhere.
const AVATAR = ["#5e6ad2", "#26b5ce", "#e07b39", "#bb87fc", "#4cb782", "#d6517d", "#c9a227", "#6b9bd8"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Avatar({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  const initials = name.replace(/\(.*?\)/g, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const c = AVATAR[hash(id) % AVATAR.length];
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: c }}
    >
      {initials}
    </span>
  );
}

/** Pass-rate ring. Shows "—" rather than 0% when nothing was evaluated. */
export function Donut({ value, size = 112, label = "pass rate", sub }: { value: number | null; size?: number; label?: string; sub?: string }) {
  const r = 42, c = 2 * Math.PI * r;
  const tone = value == null ? "var(--line)" : value >= 0.8 ? "var(--pass)" : value >= 0.5 ? "var(--warn)" : "var(--fail)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${pct(value)}`}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        {value != null && (
          <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} className="transition-[stroke-dasharray] duration-700" />
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.02em]">{pct(value)}</span>
        <span className="mt-1 text-[11px] text-muted">{sub ?? label}</span>
      </div>
    </div>
  );
}

/** Distribution of agent reply times with the scenario limit marked. Bars over the limit turn red. */
export function LatencyHistogram({ values, limit, height = 120 }: { values: number[]; limit: number; height?: number }) {
  if (!values.length) return <p className="text-sm text-muted">No reply timings measured yet.</p>;
  const step = 0.5;
  const top = Math.max(limit * 2, Math.ceil(Math.max(...values) / step) * step);
  const buckets = Array.from({ length: Math.round(top / step) }, (_, i) => ({ from: i * step, n: 0 }));
  for (const v of values) buckets[Math.min(buckets.length - 1, Math.floor(v / step))].n++;
  const max = Math.max(...buckets.map((b) => b.n));
  const limitX = (limit / top) * 100;
  return (
    <div>
      <div className="relative flex items-end gap-[3px]" style={{ height }} role="img" aria-label={`${values.length} replies; ${values.filter((v) => v > limit).length} slower than ${limit}s`}>
        {buckets.map((b) => (
          <div
            key={b.from}
            title={`${b.from.toFixed(1)}–${(b.from + step).toFixed(1)}s: ${b.n}`}
            className={`flex-1 rounded-t-[2px] transition-opacity hover:opacity-80 ${b.from >= limit ? "bg-fail/80" : "bg-accent"}`}
            style={{ height: `${b.n ? Math.max(4, (b.n / max) * 100) : 0}%` }}
          />
        ))}
        <div className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-fail/60" style={{ left: `${limitX}%` }}>
          <span className="absolute -top-1 left-1.5 whitespace-nowrap rounded bg-fail/10 px-1.5 text-[11px] font-medium text-fail">limit {limit}s</span>
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>0s</span><span>{(top / 2).toFixed(1)}s</span><span>{top.toFixed(1)}s+</span>
      </div>
    </div>
  );
}

/** Page-top summary panel: flat surface, hairline border, Linear-style. */
export function Hero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative mb-5 overflow-hidden rounded-[10px] border border-line bg-surface p-5 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      {children}
    </section>
  );
}
