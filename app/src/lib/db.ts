import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Agent, AuditEvent, DB, SafeAgent } from "./types";
import { seedPersonas, seedScenarios } from "./seed";

// ponytail: single JSON file + in-process lock. Fine for one workspace on one Node process;
// move to Postgres before running multiple instances.
const FILE = process.env.VOXPROOF_DATA_FILE ?? path.join(process.cwd(), "data", "voxproof.json");

const g = globalThis as unknown as { __vpLock?: Promise<unknown> };

async function load(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ FILE, "utf8")) as DB;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const now = new Date().toISOString();
    return {
      agents: [],
      personas: seedPersonas(),
      scenarios: seedScenarios(now),
      runs: [],
      cases: [],
      findings: [],
      audit: [],
    };
  }
}

async function save(db: DB) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, FILE);
}

export async function read(): Promise<DB> {
  await (g.__vpLock ?? Promise.resolve()).catch(() => {});
  return load();
}

/** Serialized read-modify-write. Keep `fn` synchronous and fast; do network I/O outside. */
export function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const next = (g.__vpLock ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const db = await load();
      const out = fn(db);
      await save(db);
      return out;
    });
  g.__vpLock = next;
  return next;
}

export const id = () => randomUUID();

export function audit(db: DB, action: string, target: string, meta?: AuditEvent["meta"]) {
  db.audit.unshift({ id: id(), at: new Date().toISOString(), action, target, meta });
  db.audit.length = Math.min(db.audit.length, 500);
}

export function safeAgent({ secret, ...a }: Agent): SafeAgent {
  return { ...a, hasSecret: Boolean(secret) };
}

/** For server components: marks the render as request-time so data is never baked in at build. */
export async function readPage(): Promise<DB> {
  const { connection } = await import("next/server");
  await connection();
  return read();
}
