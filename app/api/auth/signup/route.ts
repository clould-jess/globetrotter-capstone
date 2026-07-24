import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { hashPassword, isPasswordAcceptable } from "@/lib/password";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const clientKey = getClientKey(req);
  const rl = rateLimit(`signup:${clientKey}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  if (!isPasswordAcceptable(password)) {
    return NextResponse.json({ error: "Password does not meet minimum requirements" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately generic message: do not reveal whether the email is
    // already registered (avoids user-enumeration).
    return NextResponse.json({ error: "Unable to create account with the provided details" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true }, // never select passwordHash back to client
  });

  await createSession(user.id);
  await logAudit(user.id, "auth.signup", "user", user.id);

  logger.info({ userId: user.id }, "user signed up");

  return NextResponse.json({ user }, { status: 201 });
}
