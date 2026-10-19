import { RunWizard } from "@/components/run-wizard";
import { PageHeader } from "@/components/ui";
import { readPage, safeAgent } from "@/lib/db";

export default async function NewRunPage() {
  const db = await readPage();
  return (
    <>
      <PageHeader title="New test run" crumbs={[{ href: "/runs", label: "Runs" }]} />
      <RunWizard agents={db.agents.map(safeAgent)} scenarios={db.scenarios} personas={db.personas} />
    </>
  );
}
