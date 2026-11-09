"use client";
import { useActionState } from "react";
import { importEvidenceAction } from "@/lib/actions";
import { FormError, Submit } from "./client";
import { Card } from "./ui";

export function EvidenceImport({ runId, firstCaseId, remaining }: { runId: string; firstCaseId?: string; remaining: number }) {
  const [state, action] = useActionState(importEvidenceAction.bind(null, runId), undefined);
  const example = JSON.stringify([{ caseId: firstCaseId ?? "CASE_ID", conversationId: "gnani-conversation-id", disposition: "PTP", turns: [
    { role: "caller", text: "Hello", t: 1790000000 }, { role: "agent", text: "How can I help?", t: 1790000002 },
  ] }], null, 2);
  return <Card title={`Import conversations (${remaining} awaiting evidence)`} className="mb-5">
    <p className="mb-3 text-sm text-muted">Test in the Gnani console, then paste actual transcript turns and timestamps as JSON. Match each conversation to a case ID below. Import up to 100 per batch; VoxProof scores them without placing calls.</p>
    <details className="mb-3 text-xs text-muted"><summary className="cursor-pointer">JSON format example</summary><pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-3">{example}</pre></details>
    <form action={action} className="space-y-3">
      <textarea name="evidence" rows={6} required className="input font-mono text-xs" aria-label="Conversation evidence JSON" placeholder="Paste an array of conversations" />
      <FormError error={state?.error} />
      <Submit pendingText="Importing…">Import evidence</Submit>
    </form>
  </Card>;
}
