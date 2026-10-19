export type Severity = "critical" | "high" | "medium" | "low";
export type Provider = "gnani" | "demo";
export type GnaniEnv = "development" | "staging" | "production";

export interface CapabilityCheck {
  name: string;
  ok: boolean | null; // null = not verifiable yet
  detail: string;
}

export interface ConnectionCheck {
  ok: boolean;
  checkedAt: string;
  message: string;
  capabilities: CapabilityCheck[];
}

export interface Agent {
  id: string;
  name: string;
  provider: Provider;
  botId: string;
  environment: GnaniEnv;
  phone: string; // whitelisted tester number, without country code
  countryCode: string;
  secret?: string; // encrypted API key, never sent to the browser
  status: "untested" | "connected" | "error";
  lastCheck?: ConnectionCheck;
  lastTestedAt?: string;
  authorizedAt: string;
  createdAt: string;
}

export type SafeAgent = Omit<Agent, "secret"> & { hasSecret: boolean };

export interface Persona {
  id: string;
  name: string;
  language: string;
  behavior: string;
  instructions: string;
  enabled: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  category: string;
  goal: string;
  context: string;
  callerScript: string[];
  expectedOutcome: string;
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  expectedDispositions: string[];
  maxTurnLatencySec: number;
  severity: Severity;
  version: number;
  updatedAt: string;
}

export interface Turn {
  role: "agent" | "caller";
  text: string;
  t: number; // unix seconds
  interrupted?: boolean;
  language?: string;
}

export interface CallInfo {
  conversationId: string;
  status: string; // ANSWERED, NO ANSWER, ...
  disposition: string | null;
  durationSec: number | null;
  startTime: number | null;
  endTime: number | null;
  avgAgentLatencySec: number | null;
  matchedBy?: "name" | "time-window" | "simulated";
}

export type CheckStatus = "pass" | "fail" | "unverified" | "insufficient_data";

export interface Evidence {
  turn: number;
  t?: number;
  quote: string;
}

export interface Check {
  id: string;
  name: string;
  status: CheckStatus;
  detail: string;
  evidence?: Evidence[];
}

export interface JudgeResult {
  status: "scored" | "insufficient_data" | "skipped" | "error";
  model?: string;
  taskCompleted?: "yes" | "no" | "insufficient_data";
  scores?: Record<string, number | null>;
  overall?: number;
  explanation: string;
}

export interface Evaluation {
  rubricVersion: string;
  checks: Check[];
  judge: JudgeResult;
  verdict: "pass" | "fail" | "insufficient_data";
  score: number | null;
}

export type CaseStatus =
  | "queued"
  | "calling"
  | "evaluating"
  | "passed"
  | "failed"
  | "insufficient_data"
  | "error"
  | "cancelled";

export interface TestCase {
  id: string;
  runId: string;
  scenarioId: string;
  scenarioVersion: number;
  personaId: string;
  sample: number;
  seed: number;
  status: CaseStatus;
  externalRunId?: string;
  triggeredAt?: number;
  attempts: number;
  retryAt?: number;
  call?: CallInfo;
  transcript?: Turn[];
  latency?: { firstResponseSec: number | null; turnLatenciesSec: number[] };
  evaluation?: Evaluation;
  error?: string;
  updatedAt: string;
}

export interface RunConfig {
  scenarioIds: string[];
  personaIds: string[];
  samples: number;
  language: string;
  passThreshold: number;
}

export interface RunMetrics {
  total: number;
  passed: number;
  failed: number;
  insufficient: number;
  errors: number;
  passRate: number | null;
  taskCompletion: number | null;
  latency: { n: number; p50: number | null; p95: number | null; firstResponseP50: number | null };
  failureCategories: Record<string, number>;
}

export interface Run {
  id: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  simulated: boolean;
  config: RunConfig;
  snapshot: {
    agentName: string;
    scenarios: Scenario[];
    personas: Persona[];
    agentContext?: { greeting?: string; systemPrompt?: string };
  };
  baselineRunId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metrics?: RunMetrics;
  error?: string;
}

export interface Finding {
  id: string;
  runId: string;
  caseId: string;
  scenarioId: string;
  personaId: string;
  category: string;
  severity: Severity;
  title: string;
  observed: string;
  expected: string;
  evidence: Evidence[];
  likelyCause: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  source: "rule" | "judge";
  disposition: "open" | "false_positive" | "accepted_risk" | "fixed";
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: string;
  target: string;
  meta?: Record<string, string | number | boolean>;
}

export interface DB {
  agents: Agent[];
  personas: Persona[];
  scenarios: Scenario[];
  runs: Run[];
  cases: TestCase[];
  findings: Finding[];
  audit: AuditEvent[];
}
