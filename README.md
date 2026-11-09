<div align="center">

# 🎙️ VoxProof

### Test the conversation before your customers do.

**Autonomous QA for [Gnani.ai](https://gnani.ai) voice agents.**
Prepare repeatable QA cases, score imported Gnani conversations, and get evidence-backed fixes. VoxProof never changes your agent.

`Next.js 16` · `TypeScript` · `Tailwind 4` · `Zod` · `LLM judge`

</div>
<img width="1851" height="934" alt="image" src="https://github.com/user-attachments/assets/cb68f7ee-60ae-4140-82b5-5a264d8e8b68" />

---

## Why

Voice agents nail the demo, then fall over on a real caller: someone who interrupts, mixes Hindi and English, gives a vague answer, or turns out to be the wrong person. Manual testing is slow and inconsistent, and a transcript alone can't tell you whether the agent was *fast enough* or reached the *right outcome*.

VoxProof turns that into a test suite.

## How it works

```
Gnani console agent → real conversation evidence → VoxProof case import
                    → rule checks + optional LLM judge → findings → re-test
```

1. **Register** a Gnani console agent by botId. No Agent Builder API key is required.
2. **Pick** scenarios × personas × samples. Each combination becomes one reproducible, versioned test case.
3. **Test in Gnani** using the scenario's caller script, then export or copy the conversation evidence.
4. **Import** transcript turns, disposition and timestamps as JSON, matched to VoxProof case IDs (100 conversations per batch).
5. **Evaluate**: deterministic checks run first, then an LLM judge scores against a versioned rubric.
6. **Fix and verify**: apply the recommended change yourself, hit **Re-test**, and see which failures were fixed and which regressed.

## Features

| | |
|---|---|
| 🔌 **Gnani workflow** | Register an agent created in Gnani, prepare up to 1,000 QA cases per run, import real conversation transcripts, and score them. Automated Agent Builder calls/log access require separate Gnani authorization. |
| 🎭 **Personas and scenarios** | Seeded library (interrupter, Hinglish code-switcher, vague caller and more). Editable goals, scripts, expected outcomes, severity, and versioning. |
| ✅ **Deterministic checks** | Required and prohibited phrases, expected Gnani disposition code, and per-turn latency computed from real timestamps. |
| 🧠 **LLM judge** | Scores accuracy, language understanding, interruption recovery and policy adherence. It must cite turns, flag inference, and return `insufficient_data` when evidence is missing. |
| 🔎 **Evidence-backed findings** | Observed vs expected, linked transcript turns, likely cause, a concrete Gnani config change, and confidence. Mark each one fixed, accepted risk or false positive. |
| 📊 **Run metrics** | Pass rate, task completion, latency p50 (p95 only from 20+ samples), failure categories, and sample sizes always shown. |
| 🔁 **Regression loop** | Re-test against a baseline, retry failed cases, and turn any finding into a regression scenario. |
| 🧪 **Simulated agent** | Try everything without credentials. Seeded, reproducible, and labelled *simulated* everywhere. |

## Quickstart

```bash
cd app
cp .env.example .env.local     # fill in the values below
npm install
npm run dev                    # http://localhost:3000
```

| Variable | Required | Purpose |
|---|:---:|---|
| `APP_PASSWORD` | ✅ | Workspace sign-in |
| `SESSION_SECRET` | ✅ | Signs the session cookie (32+ chars) |
| `ENCRYPTION_KEY` | — | Needed only for legacy stored API credentials |
| `EVALUATOR_PROVIDER` | — | `groq` or `openrouter`; selects its API URL and default model |
| `EVALUATOR_API_KEY` | — | Enables the LLM judge. Without it, only deterministic checks run |
| `EVALUATOR_API_URL` | — | Optional OpenAI-compatible `chat/completions` URL; overrides the provider URL |
| `EVALUATOR_MODEL` | — | Optional model override |
| `VOXPROOF_DATA_FILE` | — | Data store path, default `app/data/voxproof.json` |

Generate secrets with `openssl rand -base64 48`.

> Existing simulated agents still work. New Gnani registrations use the keyless evidence import flow.

### Gnani prerequisites

- The agent's **botId** from the Gnani console.
- Actual conversation transcripts with speaker roles and Unix timestamps, copied or exported from Gnani after testing.
- No Agent Builder Platform API key is required. VoxProof cannot automatically dial or fetch private logs without access Gnani grants separately.

## API

All routes need a session and validate input with Zod. Secrets never appear in a response.

```
POST /api/agents                          register a target
POST /api/agents/:id/test-connection      confirm local setup only
POST /api/runs                            create a run → { runId, status }
POST /api/runs/:id/evidence               import up to 100 conversations as JSON
GET  /api/runs/:id                        status, metrics, findings, paginated cases
POST /api/runs/:id/cancel                 cancel queued work
GET  /api/cases/:id/audio                 legacy credential-based recording route
```

## Project layout

```
app/src/
├── app/(app)/          overview · agents · scenarios · runs · findings
├── app/api/            internal API (contract above)
├── lib/adapters/       gnani/ (real) · demo/ (simulated) behind VoiceAgentAdapter
├── lib/service.ts      run state machine: import → evaluate → finalize (Gnani)
├── lib/evaluation.ts   rule checks + LLM judge (rubric-v1)
├── lib/metrics.ts      pass rate, percentiles, baseline comparison (+ tests)
└── proxy.ts            auth gate
```

## Guardrails

- 🚫 **Never edits, commits or deploys** your agent. Recommendations stay under your control.
- 🔐 Legacy stored credentials remain encrypted; new Gnani agent registrations do not request an Agent Builder key.
- An authorisation checkbox is required when registering a Gnani agent. Keyless runs prepare up to 1,000 cases; they place no calls.
- ⚖️ Nothing is invented. Missing latency, audio or action data is shown as *unverified* or *insufficient data*, and the judge is labelled as an aid, not ground truth.

## Known limits

- **No live console control.** Without Gnani's Agent Builder Platform access, case execution and evidence collection happen in Gnani, then evidence is imported to VoxProof.
- **Runs advance while the run page is open.** The page's polling drives the pipeline. There's no separate job runner.
- **Single-process JSON store.** Fine for one workspace on one server. Move to Postgres before scaling out.
- **Action outcomes are unverified.** Gnani doesn't expose backend action state, so disposition codes are reported as platform-reported.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
node --test --experimental-strip-types src/lib/metrics.test.ts   # unit tests
```

<div align="center">
<sub>Product spec: <a href="docs/prd.md">docs/prd.md</a> · Technical plan: <a href="docs/technical.md">docs/technical.md</a></sub>
</div>
