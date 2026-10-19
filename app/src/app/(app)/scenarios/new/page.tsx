import { ScenarioForm } from "@/components/scenario-form";
import { PageHeader } from "@/components/ui";

export default function NewScenarioPage() {
  return (
    <>
      <PageHeader title="New scenario" crumbs={[{ href: "/scenarios", label: "Scenarios" }]} />
      <ScenarioForm />
    </>
  );
}
