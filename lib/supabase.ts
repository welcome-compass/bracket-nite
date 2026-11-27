import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let admin: SupabaseClient | null = null;

/** Service-role client. Server only; bypasses RLS. */
export function db(): SupabaseClient {
  admin ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: noSession });
  return admin;
}

/** Anon client. Used only to send and check sign-in codes, and to prove the Data API is locked. */
export function anon(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: noSession });
}
