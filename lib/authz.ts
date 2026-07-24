import { prisma } from "./db";

export type ItineraryAction = "view" | "edit" | "delete" | "share";

/**
 * The single authorization chokepoint for itinerary access. Every API route
 * that touches an itinerary MUST call this before reading or mutating data.
 * Do not re-implement ownership/permission logic inline in a route handler —
 * that's how IDOR bugs get introduced (one route gets the check right,
 * another gets copy-pasted wrong or forgotten entirely).
 *
 * Deny-by-default: any code path that doesn't explicitly grant access
 * returns false.
 */
export async function canAccessItinerary(
  userId: string,
  itineraryId: string,
  action: ItineraryAction
): Promise<boolean> {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: {
      ownerId: true,
      shares: {
        where: { userId },
        select: { permission: true },
      },
    },
  });

  if (!itinerary) return false;

  // Owner can do everything.
  if (itinerary.ownerId === userId) return true;

  // Only the owner can delete or manage sharing.
  if (action === "delete" || action === "share") return false;

  const share = itinerary.shares[0];
  if (!share) return false;

  if (action === "view") return true; // both VIEW and EDIT grant read access
  if (action === "edit") return share.permission === "EDIT";

  return false;
}
