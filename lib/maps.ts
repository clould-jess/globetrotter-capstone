export type MapStop = { name: string; lat: number; lng: number; approximate?: boolean };
export type MapPlace = MapStop & { id: string; kind: string; address: string; source: string; distance_m?: number };
export type MapRoute = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { distance: number; duration: number }[] };
export type Journey = { id: string; name: string; stops: MapStop[] };
export const mapCategories = [
  { id: "restaurant", fr: "Restaurants", en: "Restaurants" },
  { id: "site", fr: "Sites", en: "Sights" },
  { id: "gym", fr: "Gyms", en: "Gyms" },
  { id: "monument", fr: "Monuments", en: "Monuments" },
  { id: "ministry", fr: "Ministères", en: "Ministries" },
  { id: "hotel", fr: "Hôtels", en: "Hotels" },
] as const;
export type MapCategory = typeof mapCategories[number]["id"];
export const normaliseSearch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function validStop(value: unknown): value is MapStop {
  if (!value || typeof value !== "object") return false;
  const p = value as MapStop;
  return typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 120 &&
    Number.isFinite(p.lat) && p.lat >= -90 && p.lat <= 90 && Number.isFinite(p.lng) && p.lng >= -180 && p.lng <= 180;
}
export function formatDistance(meters: number, language = "fr") {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString(language, { maximumFractionDigits: 1 })} km`;
}
export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}
// Mobile browsers support at most three intermediate Google Maps waypoints.
// Split longer itineraries instead of silently losing stops.
export function googleRouteLinks(stops: MapStop[]) {
  const links: { href: string; from: number; to: number }[] = [];
  for (let start = 0; start < stops.length - 1; start += 4) {
    const segment = stops.slice(start, start + 5);
    const coordinate = (p: MapStop) => `${p.lat},${p.lng}`;
    const params = new URLSearchParams({ api: "1", origin: coordinate(segment[0]), destination: coordinate(segment.at(-1)!), travelmode: "driving" });
    if (segment.length > 2) params.set("waypoints", segment.slice(1, -1).map(coordinate).join("|"));
    links.push({ href: `https://www.google.com/maps/dir/?${params}`, from: start + 1, to: start + segment.length });
  }
  return links;
}
