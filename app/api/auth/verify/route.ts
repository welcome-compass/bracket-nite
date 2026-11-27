import { setSession } from "@/lib/auth";
import { cleanSignInCode, normalizeEmail } from "@/lib/session-token";
import { AuthError, verifySignInCode } from "@/lib/sign-in-code";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const code = cleanSignInCode(body?.code);
  if (!email || !code) return Response.json({ error: "Enter the code from the email." }, { status: 400 });
  try {
    if (!(await verifySignInCode(email, code))) {
      return Response.json({ error: "That code didn't work. Check it or send a new one." }, { status: 401 });
    }
    await setSession(email);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "Couldn't sign you in. Try again in a minute." }, { status: 500 });
  }
}
