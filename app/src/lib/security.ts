import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";

function key() {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length < 32) throw new Error("ENCRYPTION_KEY must be set (32+ chars)");
  return createHash("sha256").update(k).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, ct] = blob.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

/** Remove anything that looks like a credential before it reaches logs or the UI. */
export function redact(msg: string, ...secrets: (string | undefined)[]) {
  let out = msg;
  for (const s of secrets) if (s) out = out.split(s).join("[redacted]");
  return out.slice(0, 500);
}

export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Unauthorized");
}

// ponytail: in-memory per-process limiter; use a shared store if you run more than one instance.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new Error("Rate limit exceeded, try again in a minute");
  recent.push(now);
  hits.set(key, recent);
}
