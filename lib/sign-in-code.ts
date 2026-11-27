import "server-only";

import { anon } from "@/lib/supabase";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Supabase Auth emails the code (through custom SMTP) and enforces expiry and rate limits.
 * We only use it to prove the email; the app keeps its own signed cookie.
 */
export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await anon().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (!error) return;
  if (error.status === 429) throw new AuthError(429, "Code already sent. Give it a minute.");
  console.error("signInWithOtp failed", error.status, error.message);
  throw new AuthError(502, "Couldn't send the code. Try again in a minute.");
}

export async function verifySignInCode(email: string, code: string): Promise<boolean> {
  const { data, error } = await anon().auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    if (error.status === 429) throw new AuthError(429, "Too many tries. Give it a minute.");
    return false;
  }
  return data.user?.email?.toLowerCase() === email;
}
