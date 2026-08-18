import { tourismPlaces } from "@/lib/tourism";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const city = searchParams.get("city");
  const data = tourismPlaces.filter((place) => {
    const matchesType = !type || type === "all" || place.type === type;
    const matchesCity = !city || city === "all" || place.city.toLocaleLowerCase("fr") === city.toLocaleLowerCase("fr");
    return matchesType && matchesCity;
  });
  return Response.json({ data, count: data.length, checkedAt: "2026-08" });
}

