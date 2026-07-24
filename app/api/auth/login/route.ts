import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const clientKey = getClientKey(req);
  // Tighter window than signup: this is the endpoint credential-stuffing
  // and brute-force tools target directly.
  const rl = rateLimit(`login:${clientKey}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic error whether the email doesn't exist or the password is
  // wrong — this is deliberate. Distinguishing the two responses is a
  // classic user-enumeration leak.
  const genericFailure = () =>
    NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (!user) {
    logger.warn({ email }, "login attempt for unknown email");
    return genericFailure();
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    await logAudit(user.id, "auth.login.failed", "user", user.id);
    return genericFailure();
  }

  await createSession(user.id);
  await logAudit(user.id, "auth.login", "user", user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
