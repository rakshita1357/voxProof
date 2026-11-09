"use client";
import { useActionState } from "react";
import { importScenariosAction } from "@/lib/actions";
import { FormError, Submit } from "./client";
import { Card } from "./ui";

export function ScenarioImport() {
  const [state, action] = useActionState(importScenariosAction, undefined);
  return <Card title="Bulk import scenarios" className="mb-5">
    <p className="mb-2 text-sm text-muted">Paste a JSON array of up to 1,000 scenarios. Each entry needs title, category, goal, context, callerScript, expectedOutcome, requiredPhrases, prohibitedPhrases, expectedDispositions, maxTurnLatencySec, and severity.</p>
    <form action={action} className="space-y-3"><textarea name="scenarios" className="input font-mono text-xs" rows={4} required placeholder='[{"title":"Wrong number","category":"compliance","goal":"Respect wrong-number request","context":"...","callerScript":["You have the wrong number"],"expectedOutcome":"Apologize and end","requiredPhrases":[],"prohibitedPhrases":[],"expectedDispositions":[],"maxTurnLatencySec":3,"severity":"high"}]' />
      <FormError error={state?.error} /><Submit pendingText="Importing…">Import scenarios</Submit></form>
  </Card>;
}
