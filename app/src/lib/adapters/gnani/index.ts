import "server-only";
import type { Agent, CallInfo, ConnectionCheck, Turn } from "../../types";
import { ProviderError, type VoiceAgentAdapter } from "../types";

// Endpoints verified against https://docs.gnani.ai/Platform (Inya Agent Builder Platform API v2.1.0).
const BASE = "https://api.inya.ai/platform/v1";

async function call<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new ProviderError(`Network error reaching Gnani: ${(e as Error).name}`, 0, true);
  }
  const body = (await res.json().catch(() => null)) as { message?: string; requestId?: string; response?: unknown } | null;
  if (!res.ok || (body && (body as { status?: string }).status === "failure")) {
    const msg = body?.message ?? `HTTP ${res.status}`;
    throw new ProviderError(msg, res.status, res.status === 429 || res.status >= 500, body?.requestId);
  }
  return body as T;
}

const env = (a: Agent) => `environment=${encodeURIComponent(a.environment)}`;

interface LogItem {
  conversationId: string;
  name?: string;
  startTime?: number;
  endTime?: number;
}
interface Utterance {
  role: "assistant" | "user";
  content: string;
  timestamp: number;
  detectedLanguage?: string;
  userInterruptionFlag?: boolean;
}
interface Stats {
  conversationId: string;
  startTime?: number;
  endTime?: number;
  callStatus?: string;
  callDuration?: number;
  overallCallDisposition?: string;
  averageAgentLatency?: number | null;
  utteranceAnalytics?: Utterance[];
}

async function searchLogs(agent: Agent, apiKey: string, body: object) {
  const r = await call<{ response: { data: LogItem[] } }>(
    apiKey,
    `/conversations/logs?${env(agent)}&botId=${encodeURIComponent(agent.botId)}`,
    { method: "POST", body: JSON.stringify({ pageNo: 1, pageSize: 20, ...body }) },
  );
  return r.response?.data ?? [];
}

export const gnaniAdapter: VoiceAgentAdapter = {
  async validateConnection(agent, apiKey) {
    const caps: ConnectionCheck["capabilities"] = [];
    let ok = true;
    try {
      const a = await call<{ response?: { botName?: string } }>(apiKey, `/agents/${encodeURIComponent(agent.botId)}`);
      caps.push({ name: "Agent access (agents permission)", ok: true, detail: `Found agent ${a.response?.botName ?? agent.botId}` });
    } catch (e) {
      ok = false;
      caps.push({ name: "Agent access (agents permission)", ok: false, detail: safeMsg(e) });
    }
    try {
      await searchLogs(agent, apiKey, { pageSize: 1 });
      caps.push({ name: "Conversation logs (conversations permission)", ok: true, detail: "Logs, stats and audio can be read" });
    } catch (e) {
      ok = false;
      caps.push({ name: "Conversation logs (conversations permission)", ok: false, detail: safeMsg(e) });
    }
    caps.push({
      name: "Outbound test call",
      ok: null,
      detail: `Verified on first run. ${agent.countryCode} ${agent.phone} must be whitelisted with Gnani, otherwise trigger_call returns 400.`,
    });
    return {
      ok,
      checkedAt: new Date().toISOString(),
      message: ok ? "Connected to Gnani Inya" : "Connection check failed",
      capabilities: caps,
    };
  },

  async getAgentContext(agent, apiKey) {
    const r = await call<{ response?: { overview?: { greetingMessage?: string; systemPrompt?: string } } }>(
      apiKey,
      `/agents/${encodeURIComponent(agent.botId)}`,
    );
    return {
      greeting: r.response?.overview?.greetingMessage,
      systemPrompt: r.response?.overview?.systemPrompt?.slice(0, 20_000),
    };
  },

  async startConversation({ agent, apiKey, caseId }) {
    // `name` is echoed back in conversation logs, so we use it to find this call again.
    const label = `VoxProof-${caseId.slice(0, 8)}`;
    await call(apiKey, `/agents/${encodeURIComponent(agent.botId)}/trigger_call?${env(agent)}`, {
      method: "POST",
      body: JSON.stringify({ phone: agent.phone, countryCode: agent.countryCode, name: label, clientReferenceId: caseId }),
    });
    return { externalRunId: label };
  },

  async getConversation({ agent, apiKey, externalRunId, triggeredAt, claimedConversationIds }) {
    const startDate = new Date((triggeredAt - 120) * 1000).toISOString();
    const endDate = new Date(Date.now() + 60_000).toISOString();
    const items = await searchLogs(agent, apiKey, { filter: { startDate, endDate } });
    let matchedBy: CallInfo["matchedBy"] = "name";
    let hit = items.find((i) => i.name === externalRunId);
    if (!hit) {
      // Fallback: VoxProof places one call at a time per agent, so the only unclaimed
      // conversation that started after the trigger is ours.
      const fresh = items.filter(
        (i) => (i.startTime ?? 0) >= triggeredAt - 5 && !claimedConversationIds.includes(i.conversationId),
      );
      if (fresh.length === 1) [hit, matchedBy] = [fresh[0], "time-window"];
    }
    if (!hit || !hit.endTime) return null;

    const r = await call<{ response: Stats[] }>(apiKey, `/conversations/${encodeURIComponent(hit.conversationId)}/stats`);
    const s = r.response?.[0];
    if (!s) return null;
    const answered = s.callStatus === "ANSWERED";
    if (answered && !s.utteranceAnalytics?.length) return null; // transcript still processing

    const turns: Turn[] = (s.utteranceAnalytics ?? []).map((u) => ({
      role: u.role === "assistant" ? "agent" : "caller",
      text: u.content,
      t: u.timestamp,
      interrupted: u.userInterruptionFlag,
      language: u.detectedLanguage,
    }));
    return {
      call: {
        conversationId: s.conversationId,
        status: s.callStatus ?? "UNKNOWN",
        disposition: s.overallCallDisposition ?? null,
        durationSec: s.callDuration ?? null,
        startTime: s.startTime ?? hit.startTime ?? null,
        endTime: s.endTime ?? hit.endTime ?? null,
        avgAgentLatencySec: s.averageAgentLatency ?? null,
        matchedBy,
      },
      turns,
    };
  },

  async getAudio(_agent, apiKey, conversationId) {
    return fetch(`${BASE}/conversations/${encodeURIComponent(conversationId)}/audio`, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
  },
};

function safeMsg(e: unknown) {
  if (e instanceof ProviderError) return `${e.status || "network"}: ${e.message}${e.requestId ? ` (requestId ${e.requestId})` : ""}`;
  return "Unexpected error";
}
