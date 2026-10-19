"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createRunAction } from "@/lib/actions";
import type { Persona, SafeAgent, Scenario } from "@/lib/types";
import { FormError, Submit } from "./client";
import { Card, Chip, SeverityChip, btnSecondary } from "./ui";

const STEPS = ["Agent", "Scenarios & personas", "Limits & language", "Review"];
const MAX = { gnani: 12, demo: 36 };

export function RunWizard({ agents, scenarios, personas }: { agents: SafeAgent[]; scenarios: Scenario[]; personas: Persona[] }) {
  const [state, action] = useActionState(createRunAction, undefined);
  const [step, setStep] = useState(0);
  const ready = agents.filter((a) => a.status === "connected");
  const [agentId, setAgentId] = useState(ready[0]?.id ?? "");
  const [sIds, setSIds] = useState<string[]>(scenarios.slice(0, 2).map((s) => s.id));
  const [pIds, setPIds] = useState<string[]>(personas.filter((p) => p.enabled).slice(0, 2).map((p) => p.id));
  const [samples, setSamples] = useState(1);
  const [language, setLanguage] = useState("en-IN");
  const [threshold, setThreshold] = useState(0.7);

  const agent = agents.find((a) => a.id === agentId);
  const total = sIds.length * pIds.length * samples;
  const limit = agent ? MAX[agent.provider] : 0;
  const canNext = [Boolean(agent), sIds.length > 0 && pIds.length > 0, total > 0 && total <= limit, true][step];
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (!ready.length)
    return (
      <Card>
        <p className="text-sm">No agent has passed a connection check yet. <Link href="/agents" className="text-accent underline">Check or connect an agent</Link> first.</p>
      </Card>
    );

  return (
    <form action={action} className="max-w-3xl">
      <ol className="mb-5 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={`rounded-full px-3 py-1 ${i === step ? "bg-accent text-white" : i < step ? "bg-accent-soft text-accent" : "bg-line/60 text-muted"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {/* All inputs stay mounted so the final submit includes every step. */}
      <div hidden={step !== 0}>
        <Card title="Choose agent">
          <div className="space-y-2">
            {agents.map((a) => (
              <label key={a.id} className={`flex items-center gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft ${a.status !== "connected" ? "opacity-50" : ""}`}>
                <input type="radio" name="agentId" value={a.id} checked={agentId === a.id} disabled={a.status !== "connected"} onChange={() => setAgentId(a.id)} />
                <span className="font-medium">{a.name}</span>
                {a.provider === "demo" ? <Chip value="simulated" /> : <span className="font-mono text-xs text-muted">{a.botId}</span>}
                {a.status !== "connected" && <Chip value={a.status} />}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div hidden={step !== 1} className="space-y-4">
        <Card title={`Scenarios (${sIds.length})`}>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <label key={s.id} className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="scenarioIds" value={s.id} checked={sIds.includes(s.id)} onChange={() => toggle(sIds, setSIds, s.id)} className="mt-1" />
                <span>
                  <span className="font-medium">{s.title}</span> <SeverityChip s={s.severity} />
                  <span className="block text-xs text-muted">{s.goal}</span>
                </span>
              </label>
            ))}
          </div>
          <Link href="/scenarios/new" className="mt-3 inline-block text-xs text-accent underline">Create a scenario</Link>
        </Card>
        <Card title={`Personas (${pIds.length})`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {personas.filter((p) => p.enabled).map((p) => (
              <label key={p.id} className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="personaIds" value={p.id} checked={pIds.includes(p.id)} onChange={() => toggle(pIds, setPIds, p.id)} className="mt-1" />
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted">{p.behavior}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div hidden={step !== 2}>
        <Card title="Limits and language">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="language">Language</label>
              <input id="language" name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="samples">Samples per combination</label>
              <select id="samples" name="samples" value={samples} onChange={(e) => setSamples(Number(e.target.value))} className="input">
                {[1, 2, 3].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="passThreshold">Judge pass threshold</label>
              <input id="passThreshold" name="passThreshold" type="number" min="0" max="1" step="0.05" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="input" />
            </div>
          </div>
          <p className={`mt-3 text-sm ${total > limit ? "text-red-700" : "text-muted"}`}>
            {total} {agent?.provider === "demo" ? "simulated conversations" : "test calls"} (limit {limit} per run).
          </p>
        </Card>
      </div>

      <div hidden={step !== 3}>
        <Card title="Review — what will be tested">
          <ul className="space-y-2 text-sm">
            <li><b>Agent:</b> {agent?.name} {agent?.provider === "demo" && <Chip value="simulated" />}</li>
            <li><b>{total}</b> conversations: {sIds.length} scenario(s) × {pIds.length} persona(s) × {samples} sample(s), language {language}.</li>
            <li><b>Checks:</b> required/prohibited phrases, Gnani disposition, per-turn latency from Gnani timestamps, and an LLM judge (accuracy, language understanding, interruption recovery, policy) at pass threshold {threshold}.</li>
            {agent?.provider === "gnani" ? (
              <li className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Gnani will call <b>{agent.countryCode} ••••{agent.phone.slice(-4)}</b> {total} time(s), one call at a time. Whoever answers should follow the caller script shown on each case. Calls are recorded by Gnani. Expect ~2–4 minutes per call.
              </li>
            ) : (
              <li className="rounded-md border border-violet-200 bg-violet-50 p-3 text-violet-800">Simulated: no calls are placed and no audio is produced.</li>
            )}
            <li className="text-muted">VoxProof never edits or deploys your agent. Recommendations are yours to apply.</li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        <FormError error={state?.error} />
        <div className="flex gap-2">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={btnSecondary}>Back</button>}
          {step < 3 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Next</button>
          ) : (
            <Submit pendingText="Launching…">Launch run</Submit>
          )}
        </div>
      </div>
    </form>
  );
}
