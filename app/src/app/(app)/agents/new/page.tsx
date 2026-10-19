"use client";
import { useActionState, useState } from "react";
import { FormError, Submit } from "@/components/client";
import { Card, PageHeader } from "@/components/ui";
import { createAgentAction } from "@/lib/actions";

export default function NewAgentPage() {
  const [state, action] = useActionState(createAgentAction, undefined);
  const [provider, setProvider] = useState<"gnani" | "demo">("gnani");
  const gnani = provider === "gnani";
  return (
    <>
      <PageHeader title="Connect agent" crumbs={[{ href: "/agents", label: "Agents" }]}>
        VoxProof triggers Gnani test calls to a whitelisted tester number, then reads the transcript, disposition, timings and recording back from Gnani.
      </PageHeader>
      <form action={action} className="max-w-2xl space-y-4">
        <Card title="Target">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Display name</label>
              <input id="name" name="name" required className="input" placeholder="Collections agent – staging" />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="label">Target type</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {(["gnani", "demo"] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                    <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} />
                    {p === "gnani" ? "Gnani Inya agent" : "Simulated agent (demo, no calls)"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Card>

        {gnani ? (
          <Card title="Gnani credentials">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="botId">Agent ID (botId)</label>
                <input id="botId" name="botId" required className="input font-mono" placeholder="fb79920229d14460…" />
              </div>
              <div>
                <label className="label" htmlFor="environment">Environment</label>
                <select id="environment" name="environment" className="input" defaultValue="development">
                  <option value="development">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="apiKey">API key (x-api-key)</label>
                <input id="apiKey" name="apiKey" type="password" required autoComplete="off" className="input font-mono" />
                <p className="mt-1 text-xs text-muted">Encrypted at rest and never shown again. Needs <code>agents</code> and <code>conversations</code> permissions.</p>
              </div>
              <div>
                <label className="label" htmlFor="countryCode">Country code</label>
                <input id="countryCode" name="countryCode" required defaultValue="+91" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Whitelisted tester number</label>
                <input id="phone" name="phone" required inputMode="numeric" className="input" placeholder="9876543210" />
              </div>
              <p className="text-xs text-muted sm:col-span-2">
                Gnani only places test calls to numbers your account manager has whitelisted. The person (or device) answering plays the caller persona using the script VoxProof shows for each case.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <input type="hidden" name="botId" value="" />
            <input type="hidden" name="phone" value="" />
            <input type="hidden" name="countryCode" value="+91" />
            <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-fg">
              Simulated agents generate seeded transcripts locally. Results are labelled “simulated” everywhere and say nothing about a real agent.
            </p>
          </>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="authorized" required className="mt-1" />
          <span>I am authorised to test this agent, and the owner of the tester number has consented to receive automated test calls and recordings.</span>
        </label>
        <FormError error={state?.error} />
        <Submit pendingText="Saving and checking connection…">Save and test connection</Submit>
      </form>
    </>
  );
}
