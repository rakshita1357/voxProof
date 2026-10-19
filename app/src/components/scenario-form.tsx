"use client";
import { useActionState } from "react";
import { saveScenario } from "@/lib/actions";
import type { Scenario } from "@/lib/types";
import { FormError, Submit } from "./client";
import { Card } from "./ui";

export function ScenarioForm({ scenario }: { scenario?: Scenario }) {
  const [state, action] = useActionState(saveScenario.bind(null, scenario?.id ?? null), undefined);
  const s = scenario;
  return (
    <form action={action} className="max-w-3xl space-y-4">
      <Card title="Test goal">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" required defaultValue={s?.title} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" name="category" required defaultValue={s?.category ?? "workflow"} className="input" list="categories" />
            <datalist id="categories">
              {["workflow", "collections", "compliance", "support", "booking", "regression"].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="goal">Caller goal</label>
            <textarea id="goal" name="goal" required rows={2} defaultValue={s?.goal} className="input" />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="context">Setup / context</label>
            <textarea id="context" name="context" rows={2} defaultValue={s?.context} className="input" />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="callerScript">Caller script (one line per turn — read aloud by the tester)</label>
            <textarea id="callerScript" name="callerScript" rows={5} defaultValue={s?.callerScript.join("\n")} className="input font-mono text-xs" />
          </div>
        </div>
      </Card>
      <Card title="Expected outcome and checks">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="expectedOutcome">Expected outcome (used by the LLM judge)</label>
            <textarea id="expectedOutcome" name="expectedOutcome" required rows={2} defaultValue={s?.expectedOutcome} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="requiredPhrases">Required phrases (comma-separated)</label>
            <input id="requiredPhrases" name="requiredPhrases" defaultValue={s?.requiredPhrases.join(", ")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="prohibitedPhrases">Prohibited phrases (comma-separated)</label>
            <input id="prohibitedPhrases" name="prohibitedPhrases" defaultValue={s?.prohibitedPhrases.join(", ")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="expectedDispositions">Expected Gnani disposition codes</label>
            <input id="expectedDispositions" name="expectedDispositions" defaultValue={s?.expectedDispositions.join(", ")} className="input" placeholder="PTP, CLBK" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="maxTurnLatencySec">Max turn latency (s)</label>
              <input id="maxTurnLatencySec" name="maxTurnLatencySec" type="number" step="0.1" min="0.5" max="30" defaultValue={s?.maxTurnLatencySec ?? 2.5} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="severity">Severity</label>
              <select id="severity" name="severity" defaultValue={s?.severity ?? "medium"} className="input">
                {["critical", "high", "medium", "low"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Card>
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <Submit pendingText="Saving…">{s ? "Save as new version" : "Create scenario"}</Submit>
        {s && <span className="text-xs text-muted">Currently v{s.version}. Saving creates v{s.version + 1}; past runs keep the version they used.</span>}
      </div>
    </form>
  );
}
