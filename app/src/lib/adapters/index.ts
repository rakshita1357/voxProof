import type { Provider } from "../types";
import { demoAdapter } from "./demo";
import { gnaniAdapter } from "./gnani";
import type { VoiceAgentAdapter } from "./types";

export const adapters: Record<Provider, VoiceAgentAdapter> = { gnani: gnaniAdapter, demo: demoAdapter };
