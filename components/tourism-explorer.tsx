/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { T } from "./t";
import {
  tourismCities,
  tourismPlaces,
  tourismTypeIcons,
  tourismTypeLabels,
  type TouristPlaceType,
} from "@/lib/tourism";

type TypeFilter = TouristPlaceType | "all";

function osmDirections(name: string, city: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${name}, ${city}, Cameroon`)}`;
}

function projectPoint(lat: number, lng: number) {
  const x = ((lng - 8.45) / (16.2 - 8.45)) * 100;
  const y = (1 - (lat - 1.6) / (13.1 - 1.6)) * 100;
  return {
    left: `${Math.max(4, Math.min(96, x))}%`,
    top: `${Math.max(4, Math.min(96, y))}%`,
  };
}

export function TourismExplorer() {
  const [type, setType] = useState<TypeFilter>("all");
  const [city, setCity] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(tourismPlaces[0].id);
  const [mapZoom, setMapZoom] = useState(1);

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    return tourismPlaces.filter((place) => {
      const matchesType = type === "all" || place.type === type;
      const matchesCity = city === "all" || place.city === city;
      const searchable = `${place.name} ${place.city} ${place.area.fr} ${place.area.en} ${place.summary.fr} ${place.summary.en}`.toLocaleLowerCase("fr");
      return matchesType && matchesCity && (!clean || searchable.includes(clean));
    });
  }, [city, query, type]);

  const active = filtered.find((place) => place.id === selectedId) ?? filtered[0] ?? tourismPlaces[0];
  const cityMarkers = useMemo(() => {
    const seen = new Map<string, (typeof tourismPlaces)[number]>();
    for (const place of filtered) if (!seen.has(place.city)) seen.set(place.city, place);
    return [...seen.values()];
  }, [filtered]);

  return (
    <div className="tourism-explorer">
      <div className="tourism-tools">
        <label className="tourism-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hôtel, restaurant, ville..."
            aria-label="Rechercher un lieu touristique"
          />
        </label>
        <label className="city-select">
          <span><T fr="Ville" en="City" /></span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="all">Toutes les villes · All cities</option>
            {tourismCities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="tourism-filter-row" role="group" aria-label="Types de lieux">
          {(Object.keys(tourismTypeLabels) as TypeFilter[]).map((key) => (
            <button
              type="button"
              key={key}
              className={type === key ? "is-active" : ""}
              onClick={() => setType(key)}
            >
              {key !== "all" && <span aria-hidden="true">{tourismTypeIcons[key]}</span>}
              <T fr={tourismTypeLabels[key].fr} en={tourismTypeLabels[key].en} />
            </button>
          ))}
        </div>
      </div>

      <div className="tourism-map-layout">
        <aside className="tourism-map-panel" aria-label="Carte interactive">
          <div className="map-frame">
            <div
              className="tourism-country-map"
              style={{ "--map-zoom": mapZoom } as CSSProperties}
              aria-label="Carte interactive des villes touristiques"
            >
              <img
                src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Cameroon%20map%20Lambert-AEA%20administrative%20with%20regions-blank.svg?width=760"
                alt="Carte administrative du Cameroun"
              />
              {cityMarkers.map((place) => {
                const point = projectPoint(place.coordinates.lat, place.coordinates.lng);
                return (
                  <button
                    type="button"
                    key={place.city}
                    className={`city-map-pin ${place.city === "Buea" ? "pin-label-left" : ""} ${active.city === place.city ? "is-active" : ""}`}
                    style={point}
                    onClick={() => setSelectedId(place.id)}
                    aria-label={`Afficher ${place.city} sur la carte`}
                  >
                    <i />
                    <span>{place.city}</span>
                  </button>
                );
              })}
            </div>
            <div className="map-badge"><T fr="Carte interactive" en="Interactive map" /></div>
            <div className="map-zoom-controls" aria-label="Zoom de la carte">
              <button type="button" onClick={() => setMapZoom((value) => Math.min(1.45, value + .15))} aria-label="Zoomer">+</button>
              <button type="button" onClick={() => setMapZoom((value) => Math.max(1, value - .15))} aria-label="Dézoomer">−</button>
            </div>
            <div className="map-compass" aria-hidden="true">N</div>
          </div>
          <div className="active-place-summary">
            <span className={`place-icon place-icon-${active.type}`} aria-hidden="true">{tourismTypeIcons[active.type]}</span>
            <div>
              <p>{active.city} · <T fr={tourismTypeLabels[active.type].fr} en={tourismTypeLabels[active.type].en} /></p>
              <h2>{active.name}</h2>
              <span><T fr={active.area.fr} en={active.area.en} /></span>
            </div>
            <a href={osmDirections(active.name, active.city)} target="_blank" rel="noreferrer">
              <T fr="Ouvrir l’itinéraire" en="Open directions" /> ↗
            </a>
          </div>
          <p className="map-attribution"><T fr="Cliquez une ville ou utilisez le zoom. Le bouton d’itinéraire ouvre la recherche détaillée dans OpenStreetMap." en="Select a city or use the zoom controls. The directions button opens the detailed OpenStreetMap search." /></p>
        </aside>

        <div className="tourism-results">
          <div className="tourism-results-head">
            <p><strong>{filtered.length}</strong> <T fr="adresses et expériences" en="places and experiences" /></p>
            <span><T fr="Sélection vérifiée en août 2026" en="Selection checked in August 2026" /></span>
          </div>
          {filtered.length ? (
            <div className="tourism-place-list">
              {filtered.map((place) => (
                <article key={place.id} className={`tourism-place-card ${active.id === place.id ? "is-selected" : ""}`}>
                  <button type="button" onClick={() => setSelectedId(place.id)} aria-pressed={active.id === place.id}>
                    <span className="place-card-image">
                      <img src={place.image} alt={place.imageAlt.fr} loading="lazy" />
                      <span className={`place-photo-label place-photo-label-${place.imageKind}`}>
                        {place.imageKind === "place" ? <T fr="Photo du lieu" en="Place photo" /> : <T fr="Ambiance locale" en="Local context" />}
                      </span>
                    </span>
                    <span className="place-card-copy">
                      <span className="place-card-meta">
                        <i aria-hidden="true">{tourismTypeIcons[place.type]}</i>
                        {place.city} · <T fr={tourismTypeLabels[place.type].fr} en={tourismTypeLabels[place.type].en} />
                      </span>
                      <strong>{place.name}</strong>
                      <span className="place-card-summary"><T fr={place.summary.fr} en={place.summary.en} /></span>
                      <span className="place-card-details"><T fr={place.details.fr} en={place.details.en} /></span>
                    </span>
                  </button>
                  <div className="place-card-tags">
                    <div>{place.tags.map((tag) => <span key={tag.fr}><T fr={tag.fr} en={tag.en} /></span>)}</div>
                    <a href={place.sourceUrl} target="_blank" rel="noreferrer"><T fr="Informations" en="Details" /> ↗</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tourism-empty">
              <strong><T fr="Aucun lieu ne correspond à ces filtres." en="No place matches these filters." /></strong>
              <button type="button" onClick={() => { setType("all"); setCity("all"); setQuery(""); }}>
                <T fr="Afficher toute la sélection" en="Show the full selection" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
