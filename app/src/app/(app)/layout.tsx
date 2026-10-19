import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/client";
import { btnPrimary } from "@/components/ui";
import { logout } from "@/lib/actions";

const NAV = [["/", "Overview"], ["/agents", "Agents"], ["/scenarios", "Scenarios"], ["/runs", "Runs"]] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 p-4 md:block">
          <Link href="/" className="block">
            <div className="text-base font-semibold tracking-tight">VoxProof</div>
            <div className="text-xs text-muted">Workspace · Gnani agents</div>
          </Link>
          <Link href="/runs/new" className={`${btnPrimary} md:mt-4 md:w-full`}>New test run</Link>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
          {NAV.map(([href, label]) => (
            <Suspense key={href} fallback={<Link href={href} className="rounded-md px-2.5 py-1.5 text-sm text-muted">{label}</Link>}>
              <NavLink href={href}>{label}</NavLink>
            </Suspense>
          ))}
        </nav>
        <form action={logout} className="px-4 pb-3 md:absolute md:bottom-4 md:pb-0">
          <button className="text-xs text-muted hover:text-ink">Sign out</button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
