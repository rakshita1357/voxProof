<div align="center">

# 🎙️ VoxProof

### Test the conversation before your customers do.

**Autonomous QA for [Gnani.ai](https://gnani.ai) voice agents.**
Run repeatable test calls, catch failures with evidence, and get specific fixes. VoxProof never touches your agent.

`Next.js 16` · `TypeScript` · `Tailwind 4` · `Zod` · `Claude judge`

</div>

---

## Why

Voice agents nail the demo, then fall over on a real caller: someone who interrupts, mixes Hindi and English, gives a vague answer, or turns out to be the wrong person. Manual testing is slow and inconsistent, and a transcript alone can't tell you whether the agent was *fast enough* or reached the *right outcome*.

VoxProof turns that into a test suite.

## How it works

```
 ┌──────────┐   trigger_call    ┌──────────────┐    📞    ┌─────────────────┐
 │ VoxProof │ ────────────────▶ │  Gnani Inya  │ ───────▶ │ Whitelisted     │
 │  run     │                   │    agent     │          │ tester (persona)│
 └────┬─────┘                   └──────┬───────┘          └─────────────────┘
      │  logs → stats → audio          │
      ◀────────────────────────────────┘
      │
      ▼
  Rule checks ─▶ Claude judge ─▶ Findings + fixes ─▶ Re-test ─▶ Fixed / Regressed
```

1. **Connect** a Gnani agent: botId, API key and a whitelisted tester number.
2. **Pick** scenarios × personas × samples. Each combination becomes one reproducible, versioned test case.
3. **Call**: Gnani dials the tester, who follows the persona's caller script shown in VoxProof.
4. **Collect** the transcript, disposition code, per-turn timestamps and recording from Gnani.
5. **Evaluate**: deterministic checks run first, then an LLM judge scores against a versioned rubric.
6. **Fix and verify**: apply the recommended change yourself, hit **Re-test**, and see which failures were fixed and which regressed.

## Features

| | |
|---|---|
| 🔌 **Gnani integration** | Built on the documented [Inya Platform API](https://docs.gnani.ai/Platform/platform-introduction): `trigger_call`, conversation logs, stats and audio. Includes a connection check with a per-permission breakdown. |
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
| `ENCRYPTION_KEY` | ✅ | AES-256-GCM key for stored Gnani API keys (32+ chars) |
| `ANTHROPIC_API_KEY` | — | Enables the LLM judge. Without it, only deterministic checks run |
| `EVALUATOR_MODEL` | — | Judge model, default `claude-opus-5-5` |
| `VOXPROOF_DATA_FILE` | — | Data store path, default `app/data/voxproof.json` |

Generate secrets with `openssl rand -base64 48`.

> **No Gnani account yet?** Add a **Simulated agent** on the Connect page and launch a run. You'll see the whole loop in about a minute.

### Gnani prerequisites

- An API key with **`agents`** and **`conversations`** permissions
- The agent's **botId** (Gnani dashboard, or the List Agents API)
- A **tester phone number whitelisted** by your Gnani account manager. Calls to any other number are rejected.

## API

All routes need a session and validate input with Zod. Secrets never appear in a response.

```
POST /api/agents                          save target and run a connection check
POST /api/agents/:id/test-connection      capability check with safe diagnostics
POST /api/runs                            create a run → { runId, status }
GET  /api/runs/:id                        status, metrics, findings, paginated cases
POST /api/runs/:id/cancel                 cancel queued work
GET  /api/cases/:id/audio                 recording, proxied from Gnani
```

## Project layout

```
app/src/
├── app/(app)/          overview · agents · scenarios · runs · findings
├── app/api/            internal API (contract above)
├── lib/adapters/       gnani/ (real) · demo/ (simulated) behind VoiceAgentAdapter
├── lib/service.ts      run state machine: trigger → poll → evaluate → finalize
├── lib/evaluation.ts   rule checks + Claude judge (rubric-v1)
├── lib/metrics.ts      pass rate, percentiles, baseline comparison (+ tests)
└── proxy.ts            auth gate
```

## Guardrails

- 🚫 **Never edits, commits or deploys** your agent. Recommendations stay under your control.
- 🔐 API keys are **encrypted at rest**, redacted from errors, and only used server-side.
- ☎️ An explicit authorisation and consent checkbox is required for every target. Runs are capped at 12 calls, placed one at a time. Calls that fail on configuration (bad key, number not whitelisted) stop the whole run instead of re-dialling.
- ⚖️ Nothing is invented. Missing latency, audio or action data is shown as *unverified* or *insufficient data*, and the judge is labelled as an aid, not ground truth.

## Known limits

- **A human answers the call.** Gnani only dials whitelisted numbers, so fully automated callers need a telephony integration. That's on the roadmap.
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
