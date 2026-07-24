import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { canAccessItinerary } from "@/lib/authz";
import { updateItinerarySchema } from "@/lib/validations/itinerary";
import { logAudit } from "@/lib/audit";

const ITINERARY_SELECT = {
  id: true,
  title: true,
  destination: true,
  startDate: true,
  endDate: true,
  notes: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  shares: { select: { userId: true, permission: true } },
} as const;

type ShareAccess = { userId: string; permission: string };

function resolveAccess(ownerId: string, shares: ShareAccess[], userId: string) {
  if (ownerId === userId) return "OWNER";
  return shares.find((share) => share.userId === userId)?.permission === "EDIT" ? "EDIT" : "VIEW";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authorization check BEFORE the data fetch. Returning 404 rather than 403
  // for "exists but not authorized" avoids confirming the resource's
  // existence to someone probing IDs they don't have access to.
  const allowed = await canAccessItinerary(user.id, id, "view");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await prisma.itinerary.findUnique({
    where: { id },
    select: ITINERARY_SELECT,
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { shares, ...itinerary } = row;

  return NextResponse.json({
    itinerary: {
      ...itinerary,
      access: resolveAccess(itinerary.ownerId, shares, user.id),
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canAccessItinerary(user.id, id, "edit");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateItinerarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const row = await prisma.itinerary.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.destination !== undefined && { destination: data.destination }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: ITINERARY_SELECT,
  });

  const { shares, ...itinerary } = row;

  await logAudit(user.id, "itinerary.update", "itinerary", id, { fields: Object.keys(data) });

  return NextResponse.json({
    itinerary: {
      ...itinerary,
      access: resolveAccess(itinerary.ownerId, shares, user.id),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete is owner-only, enforced inside canAccessItinerary — shared users,
  // even with EDIT permission, cannot delete.
  const allowed = await canAccessItinerary(user.id, id, "delete");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.itinerary.delete({ where: { id } });
  await logAudit(user.id, "itinerary.delete", "itinerary", id);

  return NextResponse.json({ ok: true });
}
