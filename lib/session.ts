import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "gt_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a session row and sets the HttpOnly cookie. The raw token is only
 * ever sent to the client; the DB only ever stores its SHA-256 hash.
 */
export async function createSession(userId: string): Promise<void> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { tokenHash, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Reads the session cookie, validates it against the DB, and returns the
 * authenticated user or null. Expired sessions are lazily deleted.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Thin helper for route handlers that require an authenticated user. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
