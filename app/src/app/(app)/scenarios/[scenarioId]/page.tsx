import { notFound } from "next/navigation";
import { ScenarioForm } from "@/components/scenario-form";
import { PageHeader } from "@/components/ui";
import { readPage } from "@/lib/db";

export default async function EditScenarioPage({ params }: PageProps<"/scenarios/[scenarioId]">) {
  const { scenarioId } = await params;
  const scenario = (await readPage()).scenarios.find((s) => s.id === scenarioId);
  if (!scenario) notFound();
  return (
    <>
      <PageHeader title={scenario.title} crumbs={[{ href: "/scenarios", label: "Scenarios" }]} />
      <ScenarioForm key={scenario.version} scenario={scenario} />
    </>
  );
}
