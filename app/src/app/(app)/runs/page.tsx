import Link from "next/link";
import { Chip, Empty, PageHeader, Table, btnPrimary, pct, sec, td, when } from "@/components/ui";
import { readPage } from "@/lib/db";

export default async function RunsPage() {
  const { runs } = await readPage();
  return (
    <>
      <PageHeader title="Runs" actions={<Link href="/runs/new" className={btnPrimary}>New test run</Link>} />
      {!runs.length ? (
        <Empty title="No runs yet" action={<Link href="/runs/new" className={btnPrimary}>New test run</Link>}>
          Launch a run to place test calls and see scored results here.
        </Empty>
      ) : (
        <Table head={["Run", "Status", "Cases", "Pass rate", "Median latency", "Baseline"]}>
          {runs.map((r) => (
            <tr key={r.id}>
              <td className={td}>
                <Link href={`/runs/${r.id}`} className="font-medium hover:text-accent">{r.snapshot.agentName}</Link>
                <div className="text-xs text-muted">{when(r.createdAt)}</div>
              </td>
              <td className={td}>
                <div className="flex gap-1"><Chip value={r.status} />{r.simulated && <Chip value="simulated" />}</div>
              </td>
              <td className={`${td} tabular-nums`}>{r.metrics?.total ?? "—"}</td>
              <td className={`${td} tabular-nums`}>{pct(r.metrics?.passRate)}</td>
              <td className={`${td} tabular-nums`}>{sec(r.metrics?.latency.p50)}</td>
              <td className={`${td} text-xs`}>{r.baselineRunId ? <Link href={`/runs/${r.baselineRunId}`} className="text-accent-fg hover:underline">baseline</Link> : "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
