import { z } from "zod";

const lines = z
  .string()
  .max(5000)
  .transform((s) => s.split("\n").map((l) => l.trim()).filter(Boolean));
const csv = z
  .string()
  .max(2000)
  .transform((s) => s.split(",").map((l) => l.trim()).filter(Boolean));

export const AgentInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    provider: z.literal("gnani"),
    botId: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]*$/, "Agent ID may only contain letters, digits, - and _"),
    environment: z.enum(["development", "staging", "production"]).default("development"),
    apiKey: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(15).regex(/^\d*$/, "Phone must be digits only, without country code"),
    countryCode: z.string().trim().regex(/^\+\d{1,4}$/, "Country code like +91"),
    authorized: z.literal("on", { message: "You must confirm you are authorised to test this agent and number" }),
  })
  .superRefine((v, ctx) => {
    if (!v.botId) ctx.addIssue({ code: "custom", path: ["botId"], message: "Gnani agent ID (botId) is required" });
    if (!v.apiKey) ctx.addIssue({ code: "custom", path: ["apiKey"], message: "Gnani API key is required" });
    if (v.phone.length < 6) ctx.addIssue({ code: "custom", path: ["phone"], message: "Whitelisted tester phone is required" });
  });

export const ScenarioInput = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  goal: z.string().trim().min(1).max(1000),
  context: z.string().trim().max(1000),
  callerScript: lines,
  expectedOutcome: z.string().trim().min(1).max(1000),
  requiredPhrases: csv,
  prohibitedPhrases: csv,
  expectedDispositions: csv.transform((a) => a.map((s) => s.toUpperCase())),
  maxTurnLatencySec: z.coerce.number().min(0.5).max(30),
  severity: z.enum(["critical", "high", "medium", "low"]),
});

export const PersonaInput = z.object({
  name: z.string().trim().min(1).max(80),
  language: z.string().trim().min(2).max(20),
  behavior: z.string().trim().min(1).max(500),
  instructions: z.string().trim().max(2000),
  enabled: z.literal("on").optional().transform(Boolean),
});

export const RunInput = z.object({
  agentId: z.string().uuid(),
  scenarioIds: z.array(z.string().min(1)).min(1).max(20),
  personaIds: z.array(z.string().min(1)).min(1).max(10),
  samples: z.coerce.number().int().min(1).max(3),
  language: z.string().trim().min(2).max(20),
  passThreshold: z.coerce.number().min(0).max(1).default(0.7),
  baselineRunId: z.string().uuid().optional(),
});

export const FindingDisposition = z.enum(["open", "false_positive", "accepted_risk", "fixed"]);

export function firstError(e: z.ZodError) {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}
