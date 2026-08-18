import { destinations } from "@/lib/destinations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const query = url.searchParams.get("q")?.trim().toLocaleLowerCase("fr") ?? "";
  const data = destinations.filter((destination) => {
    const categoryMatch = !category || category === "all" || destination.categories.includes(category as never);
    const haystack = `${destination.name} ${destination.region.fr} ${destination.region.en} ${destination.summary.fr} ${destination.summary.en}`.toLocaleLowerCase("fr");
    return categoryMatch && (!query || haystack.includes(query));
  });
  return Response.json({ data, count: data.length });
}
