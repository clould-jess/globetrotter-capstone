import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      checks: {
        database: "ok",
      },
    });
  } catch (error) {
    logger.error({ error }, "Health check failed");

    return NextResponse.json(
      {
        status: "error",
        checks: {
          database: "error",
        },
      },
      { status: 503 },
    );
  }
}
