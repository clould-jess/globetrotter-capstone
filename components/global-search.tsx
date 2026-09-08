"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDestinations } from "./destination-provider";
import { getPlaceRegion, tourismPlaces, tourismTypeIcons, tourismTypeLabels } from "@/lib/tourism";
import { T } from "./t";

type SearchItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  icon: string;
  searchable: string;
};

const popularIds = new Set(["destination-mont-cameroun", "destination-kribi", "destination-waza", "destination-foumban", "destination-tello"]);

export function GlobalSearch() {
  const { destinations } = useDestinations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const searchItems = useMemo<SearchItem[]>(() => [
    ...destinations.map((destination) => ({
      id: `destination-${destination.slug}`,
      title: destination.name,
      meta: `${destination.region.fr} · Destination`,
      href: `/destinations/${destination.slug}`,
      icon: "✦",
      searchable: `${destination.name} ${destination.region.fr} ${destination.region.en} ${destination.summary.fr} ${destination.summary.en}`.toLocaleLowerCase("fr"),
    })),
    ...tourismPlaces.map((place) => ({
      id: `place-${place.id}`,
      title: place.name,
      meta: `${place.city} · ${getPlaceRegion(place).fr} · ${tourismTypeLabels[place.type].fr}`,
      href: `/guide?place=${encodeURIComponent(place.id)}`,
      icon: tourismTypeIcons[place.type],
      searchable: `${place.name} ${place.city} ${getPlaceRegion(place).fr} ${place.summary.fr} ${place.tags.map((tag) => tag.fr).join(" ")}`.toLocaleLowerCase("fr"),
    })),
  ], [destinations]);

  const results = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    if (!clean) return searchItems.filter((item) => popularIds.has(item.id)).slice(0, 6);
    return searchItems.filter((item) => item.searchable.includes(clean)).slice(0, 7);
  }, [query, searchItems]);

  return (
    <div className="global-search" onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
      <form action="/guide" method="get">
        <span aria-hidden="true">⌕</span>
        <input
          role="combobox"
          name="query"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          placeholder="Rechercher au Cameroun..."
          aria-label="Rechercher dans toutes les régions"
          aria-expanded={open}
          aria-controls="global-search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
        />
      </form>
      {open && (
        <div className="global-search-menu" id="global-search-suggestions">
          <p><T fr={query ? "Suggestions" : "Les plus recherchés"} en={query ? "Suggestions" : "Popular searches"} /></p>
          {results.length ? results.map((item) => (
            <Link key={item.id} href={item.href} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(false)}>
              <i aria-hidden="true">{item.icon}</i>
              <span><strong>{item.title}</strong><small>{item.meta}</small></span>
              <b>↗</b>
            </Link>
          )) : <span className="global-search-empty"><T fr="Essayez une ville, une région, un hôtel ou une activité." en="Try a city, region, hotel or activity." /></span>}
        </div>
      )}
    </div>
  );
}
