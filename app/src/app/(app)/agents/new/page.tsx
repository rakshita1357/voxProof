"use client";

import { useActionState } from "react";
import { FormError, Submit } from "@/components/client";
import { Card, PageHeader } from "@/components/ui";
import { createAgentAction } from "@/lib/actions";

export default function NewAgentPage() {
  const [state, action] = useActionState(createAgentAction, undefined);
  return (
    <>
      <PageHeader title="Connect Gnani agent" crumbs={[{ href: "/agents", label: "Agents" }]}>
        Connect a Gnani Inya voice agent and its approved tester number. VoxProof reads the completed call transcript, disposition, timing, and recording from Gnani.
      </PageHeader>
      <form action={action} className="max-w-2xl space-y-4">
        <input type="hidden" name="provider" value="gnani" />
        <Card title="Gnani agent">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Display name</label>
              <input id="name" name="name" required className="input" placeholder="Collections agent - staging" />
            </div>
            <div>
              <label className="label" htmlFor="botId">Agent ID (botId)</label>
              <input id="botId" name="botId" required className="input font-mono" placeholder="fb79920229d14460..." />
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
              <p className="mt-1 text-xs text-muted">Encrypted at rest and never shown again. The key needs <code>agents</code> and <code>conversations</code> permissions.</p>
            </div>
          </div>
        </Card>

        <Card title="Approved test number">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="countryCode">Country code</label>
              <input id="countryCode" name="countryCode" required defaultValue="+91" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Whitelisted tester number</label>
              <input id="phone" name="phone" required inputMode="numeric" className="input" placeholder="9876543210" />
            </div>
            <p className="text-xs text-muted sm:col-span-2">Gnani only places test calls to numbers your account manager has whitelisted. The person or device answering follows the caller script for each test case.</p>
          </div>
        </Card>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="authorized" required className="mt-1" />
          <span>I am authorized to test this agent, and the owner of the tester number has consented to automated test calls and recordings.</span>
        </label>
        <FormError error={state?.error} />
        <Submit pendingText="Saving and checking connection...">Save and test connection</Submit>
      </form>
    </>
  );
}
