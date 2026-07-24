import { NextResponse } from "next/server";
import { getSessionUser, destroySession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getSessionUser();
  await destroySession();

  if (user) {
    await logAudit(user.id, "auth.logout", "user", user.id);
  }

  return NextResponse.json({ ok: true });
}
