import { LogOut, Play } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { WorkspaceNav, WorkspaceTabs } from "@/components/workspace-nav";
import { logout } from "@/lib/actions";
import { readPage } from "@/lib/db";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const agents = (await readPage()).agents.map(({ id, name, status }) => ({ id, name, status }));
  return (
    <div className="min-h-screen bg-canvas md:flex">
      <aside className="flex flex-col border-b border-line bg-surface text-ink md:sticky md:top-0 md:h-screen md:w-[260px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:block">
          <Link href="/" aria-label="VoxProof overview"><Logo light /></Link>
          <div className="flex items-center gap-2 md:block">
            <Link
              href="/runs/new"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#2ea043] md:mt-5 md:w-full"
            >
              <Play size={14} aria-hidden /> New run
            </Link>
            <form action={logout} className="md:hidden">
              <button aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
                <LogOut size={16} aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <div className="hidden min-h-0 flex-1 flex-col md:flex"><WorkspaceNav agents={agents} /></div>
        <div className="hidden border-t border-line px-4 py-3 md:block">
          <form action={logout}>
            <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-[#21262d] hover:text-ink">
              <LogOut size={14} aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="w-full min-w-0 px-4 py-6 md:px-8 md:py-6"><WorkspaceTabs agents={agents} />{children}</main>
    </div>
  );
}
