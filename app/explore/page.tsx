/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { DestinationCard } from "@/components/destination-card";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { categoryLabels, destinations } from "@/lib/destinations";

type Category = keyof typeof categoryLabels;

const regions = [
  "Extrême-Nord", "Nord", "Adamaoua", "Nord-Ouest", "Ouest",
  "Sud-Ouest", "Littoral", "Centre", "Est", "Sud",
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    const frame = window.requestAnimationFrame(() => {
      if (value && value in categoryLabels) setCategory(value as Category);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    return destinations.filter((destination) => {
      const matchesCategory = category === "all" || destination.categories.includes(category);
      const searchable = `${destination.name} ${destination.region.fr} ${destination.region.en} ${destination.summary.fr} ${destination.summary.en}`.toLocaleLowerCase("fr");
      return matchesCategory && (!clean || searchable.includes(clean));
    });
  }, [category, query]);

  return (
    <PageShell>
      <section className="page-hero explore-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow light"><T fr="Du Sahel à l’Atlantique" en="From the Sahel to the Atlantic" /></p>
          <h1><T fr="Explorer le Cameroun" en="Explore Cameroon" /></h1>
          <p><T fr="Filtrez les expériences par envie, région ou mot-clé." en="Filter experiences by interest, region or keyword." /></p>
        </div>
      </section>

      <section className="explore-tools container">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only"><T fr="Rechercher" en="Search" /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un lieu, une région..."
            aria-label="Rechercher une destination"
          />
        </label>
        <div className="filter-row" role="group" aria-label="Catégories">
          {(Object.keys(categoryLabels) as Category[]).map((key) => (
            <button
              type="button"
              key={key}
              className={category === key ? "is-active" : ""}
              onClick={() => setCategory(key)}
            >
              <T fr={categoryLabels[key].fr} en={categoryLabels[key].en} />
            </button>
          ))}
        </div>
      </section>

      <section className="map-section container section-small">
        <div className="map-card">
          <div className="map-copy">
            <p className="eyebrow"><T fr="10 régions, un voyage" en="10 regions, one journey" /></p>
            <h2><T fr="Une géographie de contrastes" en="A geography of contrasts" /></h2>
            <p><T fr="Repérez les dix régions administratives et choisissez votre prochain point de départ." en="Locate all ten administrative regions and choose where your journey begins." /></p>
            <div className="region-cloud">
              {regions.map((region) => <span key={region}>{region}</span>)}
            </div>
          </div>
          <div className="map-visual">
            <img
              src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Cameroon%20map%20Lambert-AEA%20administrative%20with%20regions-blank.svg?width=760"
              alt="Carte administrative des dix régions du Cameroun"
              loading="lazy"
            />
            <span className="map-pin pin-north">Rhumsiki</span>
            <span className="map-pin pin-west">Foumban</span>
            <span className="map-pin pin-centre">Yaoundé</span>
            <span className="map-pin pin-coast">Kribi</span>
          </div>
        </div>
      </section>

      <section className="results-section container section-small">
        <div className="results-heading">
          <h2><T fr="Expériences à découvrir" en="Experiences to discover" /></h2>
          <p>{filtered.length} <T fr="résultat(s)" en="result(s)" /></p>
        </div>
        {filtered.length ? (
          <div className="destination-grid explore-grid">
            {filtered.map((destination) => <DestinationCard key={destination.slug} destination={destination} />)}
          </div>
        ) : (
          <div className="empty-state">
            <strong><T fr="Aucune destination ne correspond." en="No destination matches." /></strong>
            <button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>
              <T fr="Réinitialiser les filtres" en="Reset filters" />
            </button>
          </div>
        )}
      </section>
    </PageShell>
  );
}
