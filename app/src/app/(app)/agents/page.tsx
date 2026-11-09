import Link from "next/link";
import { Submit } from "@/components/client";
import { Chip, Empty, PageHeader, Table, btnPrimary, btnSecondary, td, when } from "@/components/ui";
import { testConnectionAction } from "@/lib/actions";
import { readPage, safeAgent } from "@/lib/db";

export default async function AgentsPage({ searchParams }: PageProps<"/agents">) {
  const selected = String((await searchParams).agent ?? "");
  const allAgents = (await readPage()).agents.map(safeAgent);
  const agents = selected ? allAgents.filter((agent) => agent.id === selected) : allAgents;
  return (
    <>
      <PageHeader title={selected ? "Agent" : "Agents"} actions={<Link href="/agents/new" className={btnPrimary}>Connect agent</Link>}>
        Gnani console agents registered for evidence-based QA.
      </PageHeader>
      {!agents.length ? (
        <Empty title="No agents connected" action={<Link href="/agents/new" className={btnPrimary}>Connect agent</Link>}>
          Create the agent in Gnani, then add its botId here. No Agent Builder API key is needed.
        </Empty>
      ) : (
        <Table head={["Agent", "Target", "Status", "Evidence", "Last tested", ""]}>
          {agents.map((a) => (
            <tr key={a.id}>
              <td className={td}>
                <div className="font-medium">{a.name}</div>
                {a.lastCheck && (
                  <details className="mt-1 text-xs text-muted">
                    <summary className="cursor-pointer">{a.lastCheck.message} · {when(a.lastCheck.checkedAt)}</summary>
                    <ul className="mt-1 space-y-1">
                      {a.lastCheck.capabilities.map((c) => (
                        <li key={c.name}>
                          <span aria-hidden>{c.ok === true ? "✓" : c.ok === false ? "✕" : "…"}</span> <b className="font-medium text-ink">{c.name}</b>: {c.detail}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </td>
              <td className={td}>
                {a.provider === "demo" ? (
                  <Chip value="simulated" label="Simulated (no calls)" />
                ) : (
                  <div className="text-xs">
                    <div>Gnani · <span className="font-mono">{a.botId}</span></div>
                    <div className="text-muted">{a.environment} · console evidence import</div>
                  </div>
                )}
              </td>
              <td className={td}><Chip value={a.status} /></td>
              <td className={`${td} text-xs`}>
                {a.provider === "demo" ? "Simulated" : "Import transcripts in each run"}
              </td>
              <td className={`${td} text-xs text-muted`}>{when(a.lastTestedAt)}</td>
              <td className={td}>
                <form action={testConnectionAction.bind(null, a.id)}>
                  <Submit className={btnSecondary} pendingText="Checking…">Check setup</Submit>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
