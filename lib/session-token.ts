import { createHmac, timingSafeEqual } from "node:crypto";

/** A host who proved their email with a sign-in code. */
export type Session = { email: string; exp: number };

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(raw: string | undefined, secret: string, now = Date.now()): Session | null {
  if (!raw || !secret) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  if (!safeEqual(raw.slice(dot + 1), sign(payload, secret))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Session>;
    if (typeof parsed.email !== "string" || !parsed.email) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
    return { email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

/** Supabase sends 6 digits by default and allows up to 10. */
export function cleanSignInCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/\s+/g, "");
  return /^\d{6,10}$/.test(code) ? code : null;
}
