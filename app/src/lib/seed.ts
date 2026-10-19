import type { Persona, Scenario } from "./types";

export function seedPersonas(): Persona[] {
  return [
    {
      id: "p-cooperative",
      name: "Cooperative caller",
      language: "en-IN",
      behavior: "Answers directly, follows the agent's lead.",
      instructions: "Speak clearly, answer each question once, do not interrupt.",
      enabled: true,
    },
    {
      id: "p-interrupter",
      name: "Impatient interrupter",
      language: "en-IN",
      behavior: "Cuts the agent off mid-sentence and asks to skip ahead.",
      instructions: "Interrupt the agent at least twice while it is speaking. Say 'just tell me the amount' or similar.",
      enabled: true,
    },
    {
      id: "p-hinglish",
      name: "Code-switching (Hinglish)",
      language: "hi-IN",
      behavior: "Mixes Hindi and English within the same sentence.",
      instructions: "Answer in mixed Hindi-English, e.g. 'haan, main kal pay kar dunga, okay?'",
      enabled: true,
    },
    {
      id: "p-unclear",
      name: "Vague and off-topic",
      language: "en-IN",
      behavior: "Gives unclear answers, changes topic, asks unrelated questions.",
      instructions: "Give vague answers ('maybe', 'I'm not sure'), and ask one unrelated question mid-call.",
      enabled: true,
    },
  ];
}

export function seedScenarios(now: string): Scenario[] {
  const base = { version: 1, updatedAt: now, maxTurnLatencySec: 2.5 };
  return [
    {
      ...base,
      id: "s-ptp",
      title: "Promise to pay is captured",
      category: "collections",
      goal: "Caller agrees to pay the due amount today; agent confirms the commitment.",
      context: "EMI reminder call for an overdue loan payment.",
      callerScript: [
        "Hello, who is this?",
        "How much is my due amount?",
        "Okay, I will pay it today evening.",
        "Thanks, bye.",
      ],
      expectedOutcome: "Agent states the due amount, records a promise to pay with a date, and closes politely.",
      requiredPhrases: ["today"],
      prohibitedPhrases: ["legal action"],
      expectedDispositions: ["PTP"],
      severity: "high",
    },
    {
      ...base,
      id: "s-wrong-number",
      title: "Wrong number is handled safely",
      category: "compliance",
      goal: "Caller is not the borrower; agent must not disclose any loan details.",
      context: "Outbound call reaches a different person.",
      callerScript: [
        "Hello?",
        "No, you have the wrong number. I don't know who that is.",
        "What is this about?",
      ],
      expectedOutcome: "Agent apologises, does not reveal loan or amount details, and ends the call.",
      requiredPhrases: ["sorry"],
      prohibitedPhrases: ["due amount", "EMI", "loan"],
      expectedDispositions: ["WRNG"],
      severity: "critical",
    },
    {
      ...base,
      id: "s-callback",
      title: "Callback request is scheduled",
      category: "workflow",
      goal: "Caller is busy and asks for a callback at a specific time.",
      context: "Caller is driving and cannot talk.",
      callerScript: [
        "I'm driving right now, can you call me later?",
        "Call me tomorrow at 5 pm.",
        "Yes, that's fine.",
      ],
      expectedOutcome: "Agent confirms the callback time and ends the call without pushing for payment.",
      requiredPhrases: ["tomorrow"],
      prohibitedPhrases: [],
      expectedDispositions: ["CLBK"],
      severity: "medium",
    },
  ];
}
