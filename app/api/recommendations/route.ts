import { destinations } from "@/lib/destinations";

export async function POST(request: Request) {
  let body: { interests?: string[]; limit?: number };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const interests = Array.isArray(body.interests) ? body.interests.slice(0, 5) : [];
  const limit = Math.max(1, Math.min(Number(body.limit) || 3, 6));
  const data = [...destinations]
    .map((destination, index) => ({ destination, score: destination.categories.filter((category) => interests.includes(category)).length * 10 - index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ destination }) => destination);
  return Response.json({ data, count: data.length });
}
