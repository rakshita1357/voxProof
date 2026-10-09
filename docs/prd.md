# VoxProof — Product Requirements Document

## 1. Product summary

**VoxProof** is an autonomous QA platform for voice agents. It simulates realistic callers, runs repeatable conversations against a connected agent, detects failures, measures performance, and recommends specific fixes with evidence. **It never silently edits or deploys the customer’s agent.**

**Positioning:** *Test the conversation before your customers do.*

## 2. Problem

Voice-agent teams can demo a happy path but struggle to systematically test interruptions, unclear requests, code-switching, unexpected answers, workflow mistakes, and latency. Manual testing is slow and inconsistent; transcripts alone cannot prove that an action succeeded or that a response was fast enough.

## 3. Target users

- **Primary:** voice AI startups and agencies deploying agents for multiple clients.
- **Secondary:** teams using voice agents for support, bookings, logistics, collections, or lead qualification.
- **Initial buyer:** engineering, QA, or implementation lead accountable for pre-launch quality.

## 4. Core workflow

1. **Connect an agent:** choose a Gnani agent or a supported external target. Configure credentials securely and run a connection check. Optional source-repository details can provide context for fix recommendations.
2. **Define a test:** select a goal, language, persona, and edge-case pack—or create a custom scenario with expected outcomes and prohibited behavior.
3. **Run conversations:** VoxProof generates caller turns, synthesizes speech when required, invokes the target through its adapter, and records events, transcripts, audio references, and timestamps.
4. **Evaluate:** deterministic checks and an LLM judge assess task completion, factual/workflow correctness, language understanding, interruption recovery, policy adherence, and latency.
5. **Investigate and improve:** open a failed conversation, inspect the evidence and likely root cause, read recommended prompt/config/code changes, and export a suggested patch or issue. The user applies the change.
6. **Verify the change:** rerun the same scenario set and compare scores. Highlight fixed failures, regressions, and unresolved issues.

## 5. MVP requirements

### P0 — Must ship

- Authentication and a single-user/workspace setup.
- Agent setup for **one verified end-to-end integration** (prefer Gnani first); use a clearly labelled demo adapter if credentials or required API capabilities are unavailable.
- Connection screen for credentials, agent identifier, target type, and a test-connection result. Never expose secrets after saving.
- Persona and scenario library with editable test goals, language, caller behavior, expected outcome, and severity.
- Test-run creation, progress states, cancellation where supported, retries, and run history.
- Per-conversation transcript/timeline, available audio playback, latency measurements, evaluation scores, and evidence-backed failures.
- Findings grouped by severity with: observed behavior, expected behavior, supporting transcript/timestamps, likely cause, recommended fix, and a rerunnable regression scenario.
- Run summary with pass rate, task completion, median/p95 latency where enough samples exist, failure categories, and comparison against a baseline.
- Manual **Re-test** action and before/after comparison. No autonomous changes to customer agents.
- Responsive, polished developer-tool UI with useful loading, empty, error, and partial-data states.

### P1 — After MVP

- Additional vendor adapters and telephony-provider integration for phone-number targets.
- GitHub repository context and generated diff suggestions.
- Scheduled regression runs, concurrency/load testing, team roles, CI checks, and exportable PDF/JSON reports.
- More languages, noisy-audio cases, and custom evaluation rubrics.

## 6. Evaluation principles

- Use deterministic checks whenever possible: required phrases, tool/action outcomes, structured expected fields, policy violations, and timestamp-based latency.
- Use an LLM judge for semantic criteria; store the rubric, evidence, score, and explanation for every judgment.
- Do not claim an action succeeded based only on what the agent said. Verify backend state when an observable tool/action result is available; otherwise label it **unverified**.
- Show sample size and missing metrics. Never imply statistical certainty from one or two calls.
- Let users set pass thresholds and mark a finding as false positive, accepted risk, or fixed.

## 7. Product UI

**Visual direction:** clean, confident, premium developer tool; light neutral canvas, dark ink typography, one restrained indigo accent, clear severity colors, generous whitespace, accessible contrast, and compact data visualization. Avoid a cluttered “AI dashboard” full of decorative cards.

- **Overview:** primary “New test run” action, latest run status, pass-rate trend, high-severity findings, and recent activity.
- **Agents:** connected targets, integration status, last tested time, credential health, and setup CTA.
- **New run wizard:** (1) choose agent, (2) choose/create scenarios and personas, (3) set language, sample count, and limits, (4) review and launch.
- **Run detail:** live progress and event stream, then score summary and failure breakdown.
- **Conversation detail:** audio player when available, synchronized transcript/timeline, expected-versus-actual behavior, metric values, and evidence.
- **Finding detail:** concise diagnosis, severity, evidence, recommended change, confidence/limitations, and “Create regression test” / “Re-test” actions.
- **Scenarios:** searchable library, category filters, create/edit/duplicate, and expected-outcome editor.

The interface must explain what will be tested before a run starts and show a clear status if a metric or audio artifact cannot be collected.

## 8. Success metrics

- Time from connecting an agent to the first completed run.
- Percentage of runs completed without infrastructure error.
- Percentage of findings accepted by users as valid.
- Reproducibility of failures on rerun.
- Number of failures resolved after users apply a recommendation, without introducing regressions.
- Median time to identify the cause of a failed scenario.

## 9. Out of scope / guardrails

- Automatically editing, committing, or deploying customer code/prompts.
- Claiming universal compatibility with any URL or phone number.
- Production calling without explicit authorization, approved test numbers, rate limits, and consent/compliance checks.
- Treating an LLM judge as ground truth or inventing missing latency/action data.

## 10. MVP acceptance criteria

A user can connect a supported target, launch a small test suite of distinct personas, watch progress, inspect at least one successful and one failed scenario, see evidence-backed scoring and a concrete fix recommendation, and rerun the suite to compare results. The system handles failed integrations gracefully and does not expose credentials or modify the target agent.
