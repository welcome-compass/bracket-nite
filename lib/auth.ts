import "server-only";

import { cookies } from "next/headers";
import { decodeSession, encodeSession, type Session } from "@/lib/session-token";

const SESSION_COOKIE = "bn_host";
const MAX_AGE = 60 * 60 * 24 * 180;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export function signingSecret(): string {
  return process.env.SESSION_SECRET || "";
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value, signingSecret());
}

export async function setSession(email: string): Promise<void> {
  const secret = signingSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession({ email, exp: Date.now() + MAX_AGE * 1000 }, secret), cookieOptions);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
