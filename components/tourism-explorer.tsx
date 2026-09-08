"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { RoadMap } from "./road-map";
import { T } from "./t";
import {
  getPlaceRegion,
  tourismCities,
  tourismPlaces,
  tourismRegions,
  tourismTypeIcons,
  tourismTypeLabels,
  type TouristPlace,
  type TouristPlaceType,
} from "@/lib/tourism";

type TypeFilter = TouristPlaceType | "all";

function googleDirections(place: TouristPlace) {
  if (place.sourceUrl.startsWith("https://www.google.com/maps/search/")) return place.sourceUrl;
  const destination = place.mapsQuery ?? `${place.name}, ${place.city}, Cameroun`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function searchableText(place: TouristPlace) {
  const region = getPlaceRegion(place);
  return `${place.name} ${place.city} ${region.fr} ${region.en} ${place.area.fr} ${place.area.en} ${place.summary.fr} ${place.summary.en} ${place.tags.map((tag) => `${tag.fr} ${tag.en}`).join(" ")}`.toLocaleLowerCase("fr");
}

export function TourismExplorer() {
  const [type, setType] = useState<TypeFilter>("all");
  const [city, setCity] = useState("all");
  const [region, setRegion] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(tourismPlaces[0].id);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get("place");
    const initialQuery = params.get("query");
    const frame = window.requestAnimationFrame(() => {
      if (placeId && tourismPlaces.some((place) => place.id === placeId)) setSelectedId(placeId);
      if (initialQuery) setQuery(initialQuery);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    return tourismPlaces.filter((place) => {
      const matchesType = type === "all" || place.type === type;
      const matchesCity = city === "all" || place.city === city;
      const matchesRegion = region === "all" || getPlaceRegion(place).fr === region;
      return matchesType && matchesCity && matchesRegion && (!clean || searchableText(place).includes(clean));
    });
  }, [city, query, region, type]);

  const suggestions = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    const source = clean ? tourismPlaces.filter((place) => searchableText(place).includes(clean)) : tourismPlaces.filter((place) => place.type === "activity" || place.id.startsWith("hotels-lodges"));
    return source.slice(0, 8);
  }, [query]);

  const active = filtered.find((place) => place.id === selectedId) ?? filtered[0] ?? tourismPlaces.find((place) => place.id === selectedId) ?? tourismPlaces[0];

  const selectSuggestion = (place: TouristPlace) => {
    setSelectedId(place.id);
    setQuery(place.name);
    setCity("all");
    setRegion("all");
    setType("all");
    setShowSuggestions(false);
    window.setTimeout(() => document.getElementById(`place-${place.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };

  return (
    <div className="tourism-explorer">
      <div className="tourism-tools">
        <div className="tourism-search-wrap">
          <div className="tourism-search">
            <span aria-hidden="true">⌕</span>
            <input
              role="combobox"
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onChange={(event) => { setQuery(event.target.value); setShowSuggestions(true); }}
              placeholder="Lieu, hôtel, appartement, restaurant, région..."
              aria-label="Rechercher partout au Cameroun"
              aria-expanded={showSuggestions}
              aria-controls="tourism-search-suggestions"
              aria-autocomplete="list"
              autoComplete="off"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche">×</button>}
          </div>
          {showSuggestions && (
            <div className="tourism-suggestions" id="tourism-search-suggestions" role="listbox">
              <div className="suggestions-title"><T fr={query ? "Suggestions" : "Recherches populaires"} en={query ? "Suggestions" : "Popular searches"} /><button type="button" onClick={() => setShowSuggestions(false)} aria-label="Fermer">×</button></div>
              {suggestions.length ? suggestions.map((place) => (
                <button type="button" key={place.id} onClick={() => selectSuggestion(place)} role="option" aria-selected={place.id === selectedId}>
                  <span aria-hidden="true">{tourismTypeIcons[place.type]}</span>
                  <span><strong>{place.name}</strong><small>{place.city} · {getPlaceRegion(place).fr}</small></span>
                  <i>↗</i>
                </button>
              )) : <p><T fr="Aucune suggestion. Essayez une ville, une région ou un type de lieu." en="No suggestion. Try a city, region or place type." /></p>}
            </div>
          )}
        </div>
        <label className="city-select">
          <span><T fr="Région" en="Region" /></span>
          <select value={region} onChange={(event) => { setRegion(event.target.value); setCity("all"); }}>
            <option value="all">Toutes les régions · All regions</option>
            {tourismRegions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
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
            <button type="button" key={key} className={type === key ? "is-active" : ""} onClick={() => setType(key)}>
              {key !== "all" && <span aria-hidden="true">{tourismTypeIcons[key]}</span>}
              <T fr={tourismTypeLabels[key].fr} en={tourismTypeLabels[key].en} />
            </button>
          ))}
        </div>
      </div>

      <div className="tourism-map-layout">
        <aside className="tourism-map-panel" aria-label="Carte interactive">
          <RoadMap active={active} places={filtered} onSelect={setSelectedId} />
          <div className="active-place-summary">
            <span className={`place-icon place-icon-${active.type}`} aria-hidden="true">{tourismTypeIcons[active.type]}</span>
            <div>
              <p>{active.city} · <T fr={tourismTypeLabels[active.type].fr} en={tourismTypeLabels[active.type].en} /></p>
              <h2>{active.name}</h2>
              <span><T fr={active.area.fr} en={active.area.en} /></span>
            </div>
            <a href={googleDirections(active)} target="_blank" rel="noreferrer"><T fr="Ouvrir dans Google Maps" en="Open in Google Maps" /> ↗</a>
          </div>
          <p className="map-attribution"><T fr="Sélectionnez une adresse puis ouvrez Google Maps : votre position peut être utilisée comme point de départ pour afficher le trajet." en="Select a place and open Google Maps: your position can be used as the starting point for directions." /></p>
        </aside>

        <div className="tourism-results">
          <div className="tourism-results-head">
            <p><strong>{filtered.length}</strong> <T fr="adresses, services et expériences" en="places, services and experiences" /></p>
            <span><T fr="Les conditions peuvent changer : confirmez avant de réserver" en="Conditions may change: confirm before booking" /></span>
          </div>
          {filtered.length ? (
            <div className="tourism-place-list">
              {filtered.map((place) => (
                <article id={`place-${place.id}`} key={place.id} className={`tourism-place-card ${active.id === place.id ? "is-selected" : ""}`}>
                  <button type="button" onClick={() => setSelectedId(place.id)} aria-pressed={active.id === place.id}>
                    {place.image && place.imageAlt ? (
                      <span className="place-card-image">
                        <img src={place.image} alt={place.imageAlt.fr} loading="lazy" />
                        <span className={`place-photo-label place-photo-label-${place.imageKind ?? "context"}`}>
                          {place.imageKind === "place" ? <T fr="Photo du lieu" en="Place photo" /> : <T fr="Ambiance locale" en="Local context" />}
                        </span>
                      </span>
                    ) : (
                      <span className={`place-card-placeholder place-card-placeholder-${place.type}`}>
                        <i aria-hidden="true">{tourismTypeIcons[place.type]}</i>
                        <small>{getPlaceRegion(place).fr}</small>
                      </span>
                    )}
                    <span className="place-card-copy">
                      <span className="place-card-meta"><i aria-hidden="true">{tourismTypeIcons[place.type]}</i>{place.city} · <T fr={tourismTypeLabels[place.type].fr} en={tourismTypeLabels[place.type].en} /></span>
                      <strong>{place.name}</strong>
                      <span className="place-card-summary"><T fr={place.summary.fr} en={place.summary.en} /></span>
                      <span className="place-card-details"><T fr={place.details.fr} en={place.details.en} /></span>
                    </span>
                  </button>
                  <div className="place-card-tags">
                    <div>{place.tags.map((tag) => <span key={`${place.id}-${tag.fr}`}><T fr={tag.fr} en={tag.en} /></span>)}</div>
                    <a href={googleDirections(place)} target="_blank" rel="noreferrer"><T fr="Google Maps" en="Google Maps" /> ↗</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tourism-empty">
              <strong><T fr="Aucun lieu ne correspond à ces filtres." en="No place matches these filters." /></strong>
              <button type="button" onClick={() => { setType("all"); setCity("all"); setRegion("all"); setQuery(""); }}><T fr="Afficher toute la sélection" en="Show the full selection" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
