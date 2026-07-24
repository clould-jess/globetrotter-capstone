import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { canAccessItinerary } from "@/lib/authz";
import { shareItinerarySchema } from "@/lib/validations/itinerary";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canAccessItinerary(user.id, id, "share");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shares = await prisma.itineraryShare.findMany({
    where: { itineraryId: id },
    select: {
      id: true,
      userId: true,
      permission: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ shares });
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sharing is owner-only — enforced in canAccessItinerary. A user with
  // EDIT access to an itinerary cannot re-share it to a third party.
  const allowed = await canAccessItinerary(user.id, id, "share");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = shareItinerarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, permission } = parsed.data;

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    // Generic error: don't confirm/deny whether an account exists for this
    // email to someone who doesn't already have access.
    return NextResponse.json({ error: "Unable to share with the provided email" }, { status: 400 });
  }

  if (targetUser.id === user.id) {
    return NextResponse.json({ error: "Cannot share an itinerary with yourself" }, { status: 400 });
  }

  const share = await prisma.itineraryShare.upsert({
    where: { itineraryId_userId: { itineraryId: id, userId: targetUser.id } },
    update: { permission },
    create: { itineraryId: id, userId: targetUser.id, permission },
    select: { id: true, userId: true, permission: true, createdAt: true },
  });

  await logAudit(user.id, "itinerary.share.grant", "itinerary", id, {
    targetUserId: targetUser.id,
    permission,
  });

  return NextResponse.json({ share }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canAccessItinerary(user.id, id, "share");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = body?.userId;
  if (typeof targetUserId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.itineraryShare.deleteMany({
    where: { itineraryId: id, userId: targetUserId },
  });

  await logAudit(user.id, "itinerary.share.revoke", "itinerary", id, { targetUserId });

  return NextResponse.json({ ok: true });
}
