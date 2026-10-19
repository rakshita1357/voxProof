import type { Agent, CallInfo, ConnectionCheck, Persona, Scenario, Turn } from "../types";

export interface StartConversationInput {
  agent: Agent;
  apiKey: string;
  caseId: string;
  scenario: Scenario;
  persona: Persona;
  seed: number;
  /** demo only: finding categories the user marked fixed for this scenario */
  fixedCategories: string[];
}

export interface ConversationResult {
  call: CallInfo;
  turns: Turn[];
}

export interface GetConversationInput extends StartConversationInput {
  externalRunId: string;
  triggeredAt: number;
  claimedConversationIds: string[];
}

export interface VoiceAgentAdapter {
  validateConnection(agent: Agent, apiKey: string): Promise<ConnectionCheck>;
  getAgentContext?(agent: Agent, apiKey: string): Promise<{ greeting?: string; systemPrompt?: string }>;
  startConversation(input: StartConversationInput): Promise<{ externalRunId: string }>;
  getConversation(input: GetConversationInput): Promise<ConversationResult | null>;
  getAudio?(agent: Agent, apiKey: string, conversationId: string): Promise<Response>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public retriable: boolean,
    public requestId?: string,
  ) {
    super(message);
  }
}
