import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { createItinerarySchema } from "@/lib/validations/itinerary";
import { logAudit } from "@/lib/audit";

// Fields we ever return for an itinerary. Never spread the raw Prisma
// result to the client — this select is the allowlist.
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
type ItineraryRow = {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  shares: ShareAccess[];
};

function resolveAccess(ownerId: string, shares: ShareAccess[], userId: string) {
  if (ownerId === userId) return "OWNER";
  return shares.find((share) => share.userId === userId)?.permission === "EDIT" ? "EDIT" : "VIEW";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only itineraries the requester owns OR has an explicit share grant for.
  // This is the query-level equivalent of the authz check: we never fetch
  // "all itineraries" and filter client-side.
  const rows = await prisma.itinerary.findMany({
    where: {
      OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
    },
    select: ITINERARY_SELECT,
    orderBy: { updatedAt: "desc" },
  });

  const itineraries = (rows as ItineraryRow[]).map((row) => {
    const { shares, ...itinerary } = row;
    return {
      ...itinerary,
      access: resolveAccess(itinerary.ownerId, shares, user.id),
    };
  });

  return NextResponse.json({ itineraries });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createItinerarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, destination, startDate, endDate, notes } = parsed.data;

  const row = await prisma.itinerary.create({
    data: {
      title,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes,
      ownerId: user.id, // ownerId always derived from session, never from client input
    },
    select: ITINERARY_SELECT,
  });

  const { shares: _shares, ...itinerary } = row;

  await logAudit(user.id, "itinerary.create", "itinerary", itinerary.id);

  return NextResponse.json({ itinerary: { ...itinerary, access: "OWNER" } }, { status: 201 });
}
