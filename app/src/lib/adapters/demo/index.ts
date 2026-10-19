import type { Turn } from "../../types";
import type { VoiceAgentAdapter } from "../types";

// Simulated target for demos without Gnani credentials. Every result it produces is
// labelled "simulated" in the UI. Faults are seeded so reruns are reproducible; a fault
// disappears once the user marks the matching finding category as fixed.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAULTS = ["none", "none", "latency", "missing_required", "prohibited_content", "disposition"] as const;

export const demoAdapter: VoiceAgentAdapter = {
  async validateConnection() {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: "Simulated agent: no real calls are placed",
      capabilities: [
        { name: "Simulated conversations", ok: true, detail: "Transcripts and timings are generated locally" },
        { name: "Audio", ok: false, detail: "Not available for simulated calls" },
      ],
    };
  },

  async startConversation({ caseId }) {
    return { externalRunId: `sim-${caseId}` };
  },

  async getConversation({ externalRunId, scenario, persona, seed, fixedCategories }) {
    const r = rng(seed);
    let fault: (typeof FAULTS)[number] = FAULTS[Math.floor(r() * FAULTS.length)];
    if (fixedCategories.includes(fault)) fault = "none";
    if (fault === "missing_required" && !scenario.requiredPhrases.length) fault = "none";
    if (fault === "prohibited_content" && !scenario.prohibitedPhrases.length) fault = "none";
    if (fault === "disposition" && !scenario.expectedDispositions.length) fault = "none";

    const start = Math.floor(Date.now() / 1000) - 120;
    let t = start + 0.6;
    const turns: Turn[] = [{ role: "agent", text: `Hello, this is the assistant calling about: ${scenario.context}`, t }];
    const slowTurn = 1 + Math.floor(r() * Math.max(1, scenario.callerScript.length - 1));
    scenario.callerScript.forEach((line, i) => {
      t += 3 + r() * 4;
      turns.push({ role: "caller", text: line, t, interrupted: persona.id === "p-interrupter" && i === 1, language: persona.language });
      t += fault === "latency" && i === slowTurn - 1 ? 3.6 + r() : 0.7 + r() * 0.9;
      const last = i === scenario.callerScript.length - 1;
      let reply = last ? `Thank you. To confirm: ${scenario.expectedOutcome}` : "Understood. Let me help you with that.";
      if (last && fault !== "missing_required") reply += ` (${scenario.requiredPhrases.join(", ")})`;
      if (last && fault === "missing_required") reply = "Okay, thank you for your time. Goodbye.";
      if (i === 0 && fault === "prohibited_content") reply = `Please note, ${scenario.prohibitedPhrases[0]} may apply.`;
      turns.push({ role: "agent", text: reply, t });
    });

    return {
      call: {
        conversationId: externalRunId,
        status: "ANSWERED",
        disposition: fault === "disposition" ? "DSCN" : (scenario.expectedDispositions[0] ?? null),
        durationSec: Math.round(t - start),
        startTime: start,
        endTime: t + 1,
        avgAgentLatencySec: null,
        matchedBy: "simulated",
      },
      turns,
    };
  },
};
