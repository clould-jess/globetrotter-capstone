import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AuditAction =
  | "itinerary.create"
  | "itinerary.update"
  | "itinerary.delete"
  | "itinerary.share.grant"
  | "itinerary.share.revoke"
  | "auth.signup"
  | "auth.login"
  | "auth.login.failed"
  | "auth.logout";

export async function logAudit(
  actorId: string,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  // Audit logging failures should never break the primary request, but they
  // should be loud in server logs so a silent gap doesn't go unnoticed.
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", { action, resourceType, resourceId, err });
  }
}
