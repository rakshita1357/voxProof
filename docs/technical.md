# VoxProof — Technical Implementation Plan

## 1. Architecture

Build the product as a **full-stack Next.js App Router application**. Do not create a separate Express/FastAPI backend. Next.js owns the UI, API routes, validation, integrations, and evaluation orchestration. Use a durable job runner integrated through Next.js route handlers for long-running multi-call tests; do not keep HTTP requests open while calls execute.

**Stack**
- Next.js (App Router), TypeScript, React Server Components by default.
- Tailwind CSS, shadcn/ui, Lucide icons, Recharts for charts.
- Supabase Auth + PostgreSQL + Storage; enforce workspace isolation with RLS.
- Zod for input/output validation; typed provider adapters.
- Inngest (or an equivalent Next.js-compatible durable workflow service) for test-run jobs, retries, concurrency and scheduled follow-ups.
- Provider abstraction for Gnani APIs, TTS/STT, and evaluation LLM. Use server-side environment variables only.

## 2. Integration strategy

Implement one reliable end-to-end path first: **Gnani adapter**. Before coding, consult the official Gnani documentation and any available docs MCP; verify exact endpoints, payloads, authentication, webhooks, supported audio formats, and whether the account can trigger a test call and retrieve call audio/logs. Do not invent endpoints or assume an API capability from a docs page title.

Define a common `VoiceAgentAdapter` interface:

```ts
interface VoiceAgentAdapter {
  validateConnection(config: unknown): Promise<ConnectionCheck>;
  startConversation(input: StartConversationInput): Promise<{ externalRunId: string }>;
  getConversation(externalRunId: string): Promise<ConversationResult | null>;
  normalizeWebhook?(payload: unknown): ProviderEvent | null;
}
```

Keep the provider-specific implementation under `src/lib/adapters/gnani/`. Add a `demo` adapter for development and demos; label its data clearly as simulated. A provider adapter may be added for an external API/agent URL only when that target exposes a supported interface. Phone-number testing requires a compatible telephony/audio-injection integration and credentials; do not imply that a URL alone enables arbitrary voice testing.

## 3. Test-run pipeline

1. **Create run:** validate target, scenario IDs, language, sample count, usage limits, and authorization. Persist the run and enqueue a durable job.
2. **Plan cases:** expand each scenario/persona combination into a reproducible case. Store a seed and scenario version.
3. **Generate caller turns:** scenario templates + persona constraints; synthesize audio using an available supported TTS provider when the target accepts audio. Prefer deterministic seeded prompts for regression tests.
4. **Execute:** call the selected adapter. Capture provider event timestamps, transcript, available audio references, tool/action outcomes, errors, and correlation IDs. Apply per-target concurrency and call limits.
5. **Normalize:** convert provider output to a provider-independent conversation schema. Mark unavailable fields explicitly.
6. **Evaluate:** run deterministic assertions first, then an LLM judge against a versioned rubric. Require structured JSON output validated with Zod. Each finding stores evidence spans, timestamps where available, severity, rationale, suggested fix, and confidence.
7. **Finalize:** compute run metrics, persist results, and notify the UI through polling or realtime updates. Failed cases can be individually rerun or run as a regression suite.

Use the database as the source of truth for job status. Webhooks must be signature-verified if the provider supports signatures, idempotent, and safe to replay.

## 4. Metrics and evaluation

- **Task success:** passed required outcome assertions / total eligible cases.
- **Accuracy:** score rubric-defined correctness; separate factual correctness from task completion.
- **Latency:** calculate from real event timestamps, clearly defining first-response latency and turn latency. Only show p50/p95 with sample count; do not infer timing from transcript text.
- **Interruption recovery, language understanding, policy adherence:** rubric-based evaluations supported by transcript/audio evidence.
- **Action correctness:** verify a downstream action or tool result when exposed; otherwise mark unverified.
- **Regression delta:** compare the same versioned test cases and evaluator rubric between baseline and new run.

Every LLM evaluation prompt must say to cite observed evidence, distinguish inference from fact, and return `insufficient_data` when evidence is missing. Version evaluator prompts and rubrics so comparisons remain interpretable.

## 5. Data model

Minimum tables (UUID primary keys, timestamps, workspace ownership):

- `workspaces`, `workspace_members`
- `agents`: workspace, display name, provider, target type, encrypted/provider-secret reference, provider agent ID/config, connection status
- `personas`: name, instructions, language, caller behavior, enabled flag
- `scenarios`: title, category, goal, setup/context, expected outcomes, assertions, severity, version
- `test_runs`: agent, status, config snapshot, started/completed timestamps, baseline run ID, aggregate metrics, error summary
- `test_cases`: run, scenario/persona version, seed, status, external run ID, transcript, timing data, audio storage references, action observations
- `evaluations`: case, evaluator/rubric version, scores, pass/fail/insufficient-data status
- `findings`: case, category, severity, title, observed vs expected, evidence, likely cause, recommendation, confidence, disposition
- `audit_events`: actor, action, target, timestamp, safe metadata

Store large audio files in object storage, not database rows. Use expiring signed URLs for playback. Never store API keys in ordinary text columns; use a managed secret store or encrypt secrets server-side with a key unavailable to the browser.

## 6. Next.js project layout

```text
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx
    (app)/page.tsx                 # overview
    (app)/agents/page.tsx
    (app)/agents/new/page.tsx
    (app)/scenarios/page.tsx
    (app)/runs/page.tsx
    (app)/runs/[runId]/page.tsx
    (app)/findings/[findingId]/page.tsx
    api/agents/route.ts
    api/agents/[agentId]/test-connection/route.ts
    api/runs/route.ts
    api/runs/[runId]/route.ts
    api/runs/[runId]/cancel/route.ts
    api/webhooks/gnani/route.ts
    api/jobs/inngest/route.ts
  components/                       # shared UI and feature components
  lib/
    adapters/gnani/
    adapters/demo/
    auth/
    db/
    schemas/
    jobs/
    evaluation/
    metrics/
    security/
  types/
```

Adjust exact webhook/job routes to the selected providers and workflow SDK after checking their current Next.js setup instructions.

## 7. API contract (internal app APIs)

- `POST /api/agents` — validate and save target config.
- `POST /api/agents/:id/test-connection` — return capability check and safe diagnostics.
- `POST /api/runs` — create a run; return `{ runId, status }` quickly.
- `GET /api/runs/:runId` — run status, summary, and pagination cursor for cases/findings.
- `POST /api/runs/:runId/cancel` — request cancellation when supported.
- `POST /api/webhooks/gnani` — receive provider events, verify authenticity, deduplicate, persist.

Validate all inputs with Zod, check workspace access on every request, rate-limit creation endpoints, and avoid returning secret/config fields. UI updates can poll run status initially; add Supabase Realtime or server-sent events only if needed.

## 8. UI implementation rules

- Build a consistent app shell: compact left navigation, workspace switcher, primary CTA, searchable/filterable tables, readable status chips, and a clear breadcrumb hierarchy.
- Overview: one primary action, current run status, trend chart, and prioritized findings—not a wall of vanity metrics.
- New-run wizard: agent → scenarios/personas → limits/language → review and launch.
- Run details: progress first; results appear progressively. Conversation view combines transcript, audio controls, timeline and evidence. Findings show expected vs observed behavior and a concrete recommendation.
- Use skeletons for loading, explicit empty states, recoverable error messages, keyboard-accessible dialogs, responsive layouts, and accessible contrast.
- Keep client components limited to interactive controls. Keep secrets, provider calls and evaluator prompts server-side.

## 9. Security, privacy, reliability

- Require explicit authorization to test each target; default to a safe small call limit and low concurrency.
- Never call arbitrary URLs without SSRF protections: allowlist schemes, block loopback/private/link-local IPs, revalidate redirects and DNS, and restrict outbound access.
- Encrypt credentials, redact secrets from logs, validate webhook signatures, and use least-privilege provider scopes.
- Provide deletion/retention controls for transcripts and audio. Avoid storing real personal data in generated scenarios; require consent/legal review before production calling or recording.
- Add idempotency keys, bounded retries, exponential backoff, timeouts, cancellation, per-run cost ceilings and audit events.
- Treat transcripts, caller audio, repository files, and retrieved docs as untrusted data. Do not let them alter system instructions or trigger code execution.

## 10. Environment and build order

Expected secrets/config (exact names may vary with chosen SDK): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `DATABASE_URL` if directly needed, `ENCRYPTION_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `GNANI_API_KEY`, and evaluator/TTS keys as required. Provide `.env.example` with placeholders only.

**Implementation order:** (1) app shell, auth, schema and demo data; (2) agent setup and connection-check flow; (3) one verified Gnani call lifecycle; (4) durable run pipeline and normalized results; (5) rules + LLM evaluation; (6) transcript/audio/finding screens; (7) reruns and comparisons; (8) security, error states, tests and deployment.

**Definition of done:** a user can complete one end-to-end test run, inspect evidence behind a failure, receive a specific recommendation, and rerun the scenario. The application never claims it fixed the target; suggested changes remain under user control.
