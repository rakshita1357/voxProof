"use client";

import { useActionState } from "react";
import { FormError, Submit } from "@/components/client";
import { Card, PageHeader } from "@/components/ui";
import { createAgentAction } from "@/lib/actions";

export default function NewAgentPage() {
  const [state, action] = useActionState(createAgentAction, undefined);
  return (
    <>
      <PageHeader title="Register Gnani agent" crumbs={[{ href: "/agents", label: "Agents" }]}>
        Create your agent in the Gnani console, then register its ID here. VoxProof evaluates conversations you import; no Agent Builder API key is needed.
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
          </div>
        </Card>

        <input type="hidden" name="countryCode" value="+91" />
        <input type="hidden" name="phone" value="" />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="authorized" required className="mt-1" />
          <span>I am authorized to test this agent and import its conversation evidence.</span>
        </label>
        <FormError error={state?.error} />
        <Submit pendingText="Registering...">Register agent</Submit>
      </form>
    </>
  );
}
