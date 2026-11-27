import { anon, db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** After deploy, `anonDataApi` should be "denied". */
export async function GET() {
  try {
    const { error } = await db().from("tournaments").select("id").limit(1);
    if (error) throw error;
    const probe = await anon().from("tournaments").select("id").limit(1);
    const anonDataApi = probe.error ? "denied" : probe.data.length ? "open" : "empty-or-open";
    return Response.json({ ok: anonDataApi === "denied", anonDataApi, session: Boolean(process.env.SESSION_SECRET) });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Database is not reachable. Check the Supabase env vars." }, { status: 500 });
  }
}
