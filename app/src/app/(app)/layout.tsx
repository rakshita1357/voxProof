import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/client";
import { Logo } from "@/components/ui";
import { logout } from "@/lib/actions";

const NAV = [["/", "Overview"], ["/agents", "Agents"], ["/scenarios", "Scenarios"], ["/runs", "Runs"]] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b border-line bg-[#0b0c0d] text-ink md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:block md:py-6">
          <Link href="/" aria-label="VoxProof overview"><Logo light /></Link>
          <div className="flex items-center gap-2 md:block">
            <Link
              href="/runs/new"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#6c78e0] md:mt-5 md:w-full"
            >
              <Plus size={16} aria-hidden /> New test run
            </Link>
            <form action={logout} className="md:hidden">
              <button aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
                <LogOut size={16} aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {NAV.map(([href, label]) => (
            <Suspense key={href} fallback={<span className="rounded-lg px-3 py-2 text-sm text-white/60">{label}</span>}>
              <NavLink href={href}>{label}</NavLink>
            </Suspense>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 md:block">
          <div className="text-xs text-muted">QA workspace for Gnani Inya agents</div>
          <form action={logout} className="mt-3">
            <button className="inline-flex items-center gap-2 text-[13px] text-white/60 hover:text-white">
              <LogOut size={14} aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
