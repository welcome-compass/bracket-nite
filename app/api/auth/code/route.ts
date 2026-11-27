import { signingSecret } from "@/lib/auth";
import { normalizeEmail } from "@/lib/session-token";
import { AuthError, sendSignInCode } from "@/lib/sign-in-code";

export async function POST(request: Request) {
  if (!signingSecret()) return Response.json({ error: "SESSION_SECRET is not set on the server." }, { status: 500 });
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
  try {
    await sendSignInCode(email);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "Couldn't send the code. Try again in a minute." }, { status: 500 });
  }
}
