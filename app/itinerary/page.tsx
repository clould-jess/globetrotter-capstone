/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { destinations } from "@/lib/destinations";

const STORAGE_KEY = "cameroon-itinerary";

export default function ItineraryPage() {
  const [stops, setStops] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(destinations[0].slug);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("stops")?.split(",").filter((slug) => destinations.some((item) => item.slug === slug));
      if (shared?.length) {
        const unique = [...new Set(shared)];
        setStops(unique);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
      } else {
        try {
          const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as string[];
          setStops(saved.filter((slug) => destinations.some((item) => item.slug === slug)));
        } catch { setStops([]); }
      }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
  }, [loaded, stops]);

  const selectedStops = useMemo(() => stops.map((slug) => destinations.find((destination) => destination.slug === slug)).filter(Boolean), [stops]);
  const addStop = () => setStops((current) => current.includes(selected) ? current : [...current, selected]);
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= stops.length) return;
    setStops((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const share = async () => {
    const url = `${window.location.origin}/itinerary?stops=${stops.join(",")}`;
    try { await navigator.clipboard.writeText(url); setMessage("Lien copié · Link copied"); }
    catch { setMessage(url); }
  };

  return (
    <PageShell>
      <section className="itinerary-hero page-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow light"><T fr="Carnet de route" en="Travel notebook" /></p>
          <h1><T fr="Construisez votre itinéraire" en="Build your itinerary" /></h1>
          <p><T fr="Ajoutez, classez et partagez vos étapes préférées." en="Add, arrange and share your favourite stops." /></p>
        </div>
      </section>
      <section className="itinerary-workspace container section-small">
        <aside className="itinerary-sidebar">
          <p className="eyebrow"><T fr="Ajouter une étape" en="Add a stop" /></p>
          <h2><T fr="Où allez-vous ensuite ?" en="Where to next?" /></h2>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Destination">
            {destinations.map((destination) => <option key={destination.slug} value={destination.slug}>{destination.name} · {destination.region.fr}</option>)}
          </select>
          <button type="button" className="button button-forest" onClick={addStop}><T fr="＋ Ajouter l’étape" en="＋ Add stop" /></button>
          <div className="planner-tip"><strong><T fr="Astuce" en="Tip" /></strong><p><T fr="Commencez par deux ou trois lieux proches, puis ajustez selon votre temps." en="Start with two or three nearby places, then adapt to your time." /></p></div>
        </aside>
        <div className="itinerary-board">
          <div className="itinerary-board-head">
            <div><p className="eyebrow"><T fr="Mon voyage" en="My trip" /></p><h2>{stops.length} <T fr="étape(s)" en="stop(s)" /></h2></div>
            <button type="button" className="share-button" disabled={!stops.length} onClick={share}>↗ <T fr="Partager" en="Share" /></button>
          </div>
          {message && <p className="share-message" role="status">{message}</p>}
          {selectedStops.length ? (
            <ol className="stop-list">
              {selectedStops.map((destination, index) => destination && (
                <li key={destination.slug}>
                  <span className="stop-number">{String(index + 1).padStart(2, "0")}</span>
                  <img src={destination.image} alt="" />
                  <div className="stop-copy"><span>{destination.region.fr}</span><h3>{destination.name}</h3><p><T fr={destination.duration.fr} en={destination.duration.en} /></p></div>
                  <div className="stop-controls">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter">↑</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === stops.length - 1} aria-label="Descendre">↓</button>
                    <button type="button" className="remove-stop" onClick={() => setStops((current) => current.filter((slug) => slug !== destination.slug))} aria-label="Retirer">×</button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="itinerary-empty"><span>✦</span><h3><T fr="Votre carnet est encore vide" en="Your notebook is empty" /></h3><p><T fr="Ajoutez une première destination ou explorez les expériences." en="Add a first destination or explore all experiences." /></p><Link className="text-link" href="/explore"><T fr="Explorer les destinations" en="Explore destinations" /> →</Link></div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
