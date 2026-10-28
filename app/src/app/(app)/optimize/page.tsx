import Link from "next/link";
import { Chip, Empty, PageHeader, SeverityChip } from "@/components/ui";
import { readPage } from "@/lib/db";

export default async function OptimizePage() {
  const db = await readPage();
  const findings = db.findings.filter((finding) => finding.disposition === "open");
  return (
    <>
      <PageHeader title="Optimize">Review open evaluator findings, then apply the recommendation in your Gnani agent and re-run the affected tests.</PageHeader>
      {!findings.length ? <Empty title="No open findings">Completed runs with evaluator findings will appear here.</Empty> : (
        <section className="overflow-hidden rounded-md border border-line bg-surface">
          {findings.map((finding) => <Link key={finding.id} href={`/findings/${finding.id}`} className="flex gap-4 border-b border-line px-4 py-4 last:border-b-0 hover:bg-surface-2">
            <SeverityChip s={finding.severity} />
            <span className="min-w-0 flex-1"><span className="block font-medium">{finding.title}</span><span className="mt-1 block text-[13px] text-muted">{finding.recommendation}</span></span>
            <Chip value={finding.category} />
          </Link>)}
        </section>
      )}
    </>
  );
}
