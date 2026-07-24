import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { searchQuerySchema } from "@/lib/validations/search";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientKey = getClientKey(req);
  const rl = rateLimit(`search:${clientKey}`, { limit: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many search requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q"),
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit, cursor } = parsed.data;

  const destinations = await prisma.destination.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { country: { contains: q } },
        { tags: { contains: q.toLowerCase() } },
      ],
    },
    take: limit + 1, // fetch one extra to know if there's a next page
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { name: "asc" },
  });

  const hasMore = destinations.length > limit;
  const page = hasMore ? destinations.slice(0, limit) : destinations;

  return NextResponse.json({
    destinations: page.map((destination) => ({
      ...destination,
      tags: destination.tags.split(",").filter(Boolean),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
