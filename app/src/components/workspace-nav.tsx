"use client";

import { BarChart3, ClipboardCheck, Download, Plus, Settings, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Agent = { id: string; name: string; status: string };

export function WorkspaceNav({ agents }: { agents: Agent[] }) {
  const search = useSearchParams();
  const selected = search.get("agent") ?? agents[0]?.id;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Gnani agents</p>
        <div className="space-y-0.5">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents?agent=${encodeURIComponent(agent.id)}`}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] ${selected === agent.id ? "bg-surface-2 font-medium text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              <span className={`h-2 w-2 rounded-full ${agent.status === "connected" ? "bg-pass" : agent.status === "error" ? "bg-fail" : "bg-muted"}`} />
              <span className="truncate">{agent.name}</span>
            </Link>
          ))}
          {!agents.length && <p className="px-3 py-2 text-xs text-muted">No agent connected.</p>}
        </div>
      </div>
      <div className="border-t border-line p-3">
        <Link href="/agents/new" className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-accent-fg hover:bg-surface-2"><Plus size={15} /> Connect Gnani agent</Link>
      </div>
    </>
  );
}

export function WorkspaceTabs({ agents }: { agents: Agent[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = search.get("agent") ?? agents[0]?.id;
  if (!selected) return null;
  const query = `?agent=${encodeURIComponent(selected)}`;
  const tabs = [["Agent", "/agents", Settings], ["Metrics", "/", BarChart3], ["Tests", "/scenarios", ClipboardCheck], ["Runs", "/runs", Download], ["Optimize", "/optimize", Wrench]] as const;
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <nav aria-label="Agent views" className="mb-5 flex overflow-x-auto border-b border-line">{tabs.map(([label, href, Icon]) => <Link key={href} href={`${href}${query}`} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] ${active(href) ? "border-[#f78166] font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}><Icon size={15} />{label}</Link>)}</nav>;
}
