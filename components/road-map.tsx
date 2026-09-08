"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { API_BASE, responseMessage } from "@/lib/api";
import { tourismPlaces, type TouristPlace } from "@/lib/tourism";

type Stop = { name: string; lat: number; lng: number };
type Place = Stop & { id: string; kind: string; address: string; source: string };
type Route = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { distance: number; duration: number }[] };
type Journey = { id: string; name: string; stops: Stop[] };
const minutes = (seconds: number) => { const mins = Math.max(1, Math.round(seconds / 60)); return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`; };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/community${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw new Error(await responseMessage(response));
  return response.status === 204 ? undefined as T : response.json();
}

export function RoadMap({ active, places = tourismPlaces, onSelect }: { active?: TouristPlace; places?: TouristPlace[]; onSelect?: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const library = useRef<typeof Leaflet | null>(null);
  const markers = useRef<Leaflet.LayerGroup | null>(null);
  const routeLine = useRef<Leaflet.LayerGroup | null>(null);
  const positionMarker = useRef<Leaflet.LayerGroup | null>(null);
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [point, setPoint] = useState<Stop | null>(null);
  const [position, setPosition] = useState<Stop | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [nearby, setNearby] = useState<Place[]>([]);
  const [category, setCategory] = useState("gym");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("Mon parcours");
  const [saved, setSaved] = useState<Journey[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [catalogId, setCatalogId] = useState(tourismPlaces[0].id);
  const revision = useRef(0);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void import("leaflet").then(L => {
      if (disposed || !container.current) return;
      library.current = L;
      const instance = L.map(container.current, { center: [3.866, 11.517], zoom: 12, scrollWheelZoom: false });
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance).on("tileerror", () => setNotice("Certains fonds de carte ne se chargent pas. Vérifiez votre connexion."));
      markers.current = L.layerGroup().addTo(instance);
      routeLine.current = L.layerGroup().addTo(instance);
      positionMarker.current = L.layerGroup().addTo(instance);
      instance.on("click", event => setPoint({ name: "Point choisi sur la carte", lat: event.latlng.lat, lng: event.latlng.lng }));
      setReady(true);
    }).catch(() => setError("Impossible de charger la carte."));
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    if (container.current) observer.observe(container.current);
    return () => { disposed = true; mounted.current = false; observer.disconnect(); map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const L = library.current; const layer = markers.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const place of places.slice(0, 250)) {
      const marker = L.circleMarker([place.coordinates.lat, place.coordinates.lng], { radius: place.id === active?.id ? 9 : 5, color: "#165c42", fillOpacity: .85 });
      const label = document.createElement("span"); label.textContent = `${place.name} — position indicative`;
      marker.bindTooltip(label).on("click", () => { onSelect?.(place.id); setPoint({ name: place.name, ...place.coordinates }); }).addTo(layer);
    }
    for (const place of nearby) {
      const label = document.createElement("span"); label.textContent = place.name;
      L.circleMarker([place.lat, place.lng], { radius: 8, color: "#b76018", fillOpacity: .85 }).bindTooltip(label).on("click", () => setPoint(place)).addTo(layer);
    }
  }, [active?.id, nearby, onSelect, places, ready]);

  useEffect(() => {
    if (ready && active) { map.current?.setView([active.coordinates.lat, active.coordinates.lng], 13); }
  }, [active, ready]);

  useEffect(() => {
    const L = library.current;
    if (!L || !routeLine.current || !map.current) return;
    routeLine.current.clearLayers();
    if (route) {
      const line = L.polyline(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), { color: "#126545", weight: 5 }).addTo(routeLine.current);
      map.current.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
    stops.forEach((stop, i) => {
      const label = document.createElement("span"); label.textContent = `${i + 1}. ${stop.name}`;
      L.circleMarker([stop.lat, stop.lng], { color: "#183e32", fillColor: "#ffce70", fillOpacity: 1, radius: 9 }).bindTooltip(label, { permanent: true, direction: "top" }).addTo(routeLine.current!);
    });
  }, [route, stops, ready]);

  function changeStops(next: Stop[]) { revision.current += 1; setStops(next); setRoute(null); setNotice(""); }
  function add(stop: Stop) {
    if (stops.length >= 10) { setError("Maximum 10 étapes par parcours."); return; }
    if (stops.some(p => Math.abs(p.lat-stop.lat) < .00001 && Math.abs(p.lng-stop.lng) < .00001)) { setError("Ce point est déjà dans le parcours."); return; }
    setError(""); changeStops([...stops, stop]);
  }
  function locate() {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) { setError("La position nécessite HTTPS. Choisissez votre départ en cliquant sur la carte."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(result => {
      if (!mounted.current) return;
      const next = { name: "Ma position", lat: result.coords.latitude, lng: result.coords.longitude };
      setPosition(next); setPoint(next); setAccuracy(Math.round(result.coords.accuracy)); setLocating(false);
      const L = library.current;
      if (L && map.current && positionMarker.current) {
        positionMarker.current.clearLayers();
        L.circle([next.lat, next.lng], { radius: result.coords.accuracy, color: "#3477c4", weight: 1 }).addTo(positionMarker.current);
        L.circleMarker([next.lat, next.lng], { radius: 7, color: "#fff", fillColor: "#3477c4", fillOpacity: 1 }).addTo(positionMarker.current);
        map.current.setView([next.lat, next.lng], 14);
      }
    }, result => { if (mounted.current) { setLocating(false); setError(result.code === 1 ? "Position refusée. Vous pouvez choisir le départ sur la carte." : "Position indisponible. Réessayez à l’extérieur ou choisissez un point."); } }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  async function calculate() {
    setBusy(true); setError(""); const version = revision.current;
    try { const next = await api<Route>("/maps/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stops: stops.map(({lat, lng}) => ({lat, lng})) }) }); if (version === revision.current) setRoute(next); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Trajet indisponible."); }
    finally { setBusy(false); }
  }
  async function findPlaces() {
    const center = map.current?.getCenter(); if (!center) return;
    setBusy(true); setError(""); setNearby([]);
    try {
      const result = await api<{ places: Place[] }>(`/maps/places?kind=${category}&lat=${center.lat}&lng=${center.lng}`);
      setNearby(result.places); setNotice(`${result.places.length} lieu(x) répertorié(s) à moins de 15 km. Données OpenStreetMap : couverture parfois incomplète.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Recherche indisponible."); }
    finally { setBusy(false); }
  }
  async function loadSaved() {
    setBusy(true); setError("");
    try { setSaved(await api<Journey[]>("/journeys")); setSavedLoaded(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Parcours indisponibles."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try { await api("/journeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, stops }) }); setNotice("Parcours enregistré dans votre compte."); setSaved(await api<Journey[]>("/journeys")); setSavedLoaded(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  async function removeSaved(id: string) {
    if (!confirm("Supprimer ce parcours enregistré ?")) return;
    setBusy(true);
    try { await api(`/journeys/${id}`, { method: "DELETE" }); setSaved(current => current.filter(j => j.id !== id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Suppression impossible."); }
    finally { setBusy(false); }
  }
  const google = stops.length >= 2 ? `https://www.google.com/maps/dir/?api=1&origin=${stops[0].lat},${stops[0].lng}&destination=${stops.at(-1)!.lat},${stops.at(-1)!.lng}&waypoints=${encodeURIComponent(stops.slice(1,-1).map(s => `${s.lat},${s.lng}`).join("|"))}&travelmode=driving` : "";

  return <section className="road-map">
    <div className="street-map" ref={container} aria-label="Carte routière interactive : cliquez pour choisir une étape" />
    <div className="route-controls">
      <div className="route-heading"><h3>Votre trajet, étape par étape</h3><button className="button button-outline" disabled={!ready || locating} onClick={locate}>{locating ? "Localisation…" : "Afficher ma position"}</button></div>
      {position && <p>Position obtenue · précision ±{accuracy} m. <button onClick={() => add(position)}>Ajouter comme étape</button></p>}
      <p className="map-privacy">La position n’est demandée qu’à votre clic. Calculer transmet les coordonnées au service de trajet OSRM ; rechercher transmet le centre de carte à OpenStreetMap/Overpass. Enregistrer conserve les étapes dans votre compte.</p>
      <label>Choisir un lieu du catalogue<select value={catalogId} onChange={e => setCatalogId(e.target.value)}>{tourismPlaces.map(p => <option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}</select></label>
      <button className="button button-outline" onClick={() => { const p = tourismPlaces.find(p => p.id === catalogId); if (p) { setPoint({ name: p.name, ...p.coordinates }); map.current?.setView([p.coordinates.lat,p.coordinates.lng], 15); } }}>Repérer ce lieu</button>
      <small>Les anciens repères du catalogue sont indicatifs, parfois centrés sur une ville. Vérifiez le point exact sur la carte avant de l’ajouter. Cliquez sur la carte pour choisir ou corriger une étape.</small>
      {point && <div className="selected-map-point"><label>Point sélectionné<input value={point.name} maxLength={120} onChange={e => setPoint({ ...point, name: e.target.value })} /></label><small>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</small><button className="button button-sun" disabled={!point.name.trim()} onClick={() => add(point)}>Ajouter au parcours</button></div>}
      <div className="nearby-search"><label>Lieux autour du centre de carte<select value={category} onChange={e => setCategory(e.target.value)}><option value="gym">Salles de sport</option><option value="monument">Monuments et mémoriaux</option><option value="ministry">Ministères</option></select></label><button className="button button-outline" disabled={busy || !ready} onClick={() => void findPlaces()}>Rechercher dans cette zone</button></div>
      {nearby.length > 0 && <ul className="nearby-map-results">{nearby.map(p => <li key={p.id}><button onClick={() => { setPoint(p); map.current?.setView([p.lat,p.lng], 16); }}>{p.name}</button><a href={p.source} target="_blank" rel="noreferrer">Fiche OSM ↗</a></li>)}</ul>}
      <ol className="route-stops">{stops.map((stop, i) => <li key={`${stop.lat}-${stop.lng}`}><span>{i === 0 ? "Départ" : i === stops.length - 1 ? "Arrivée" : `Étape ${i}`} · {stop.name}</span><div><button aria-label={`Monter ${stop.name}`} disabled={i === 0} onClick={() => { const next = [...stops]; [next[i-1],next[i]] = [next[i],next[i-1]]; changeStops(next); }}>↑</button><button aria-label={`Descendre ${stop.name}`} disabled={i === stops.length-1} onClick={() => { const next = [...stops]; [next[i+1],next[i]] = [next[i],next[i+1]]; changeStops(next); }}>↓</button><button aria-label={`Retirer ${stop.name}`} onClick={() => changeStops(stops.filter((_,n) => n !== i))}>×</button></div></li>)}</ol>
      {!stops.length && <p>Ajoutez au moins un départ et une arrivée. Jusqu’à 10 étapes.</p>}
      <button className="button button-forest" disabled={busy || stops.length < 2} onClick={() => void calculate()}>{busy ? "Traitement…" : "Calculer le trajet en voiture"}</button>
      {route && <div className="route-estimate" role="status"><strong>{(route.distance/1000).toFixed(1)} km · {minutes(route.duration)}</strong><p>Durée estimée hors trafic, pauses et fermetures. Vérifiez les conditions de route.</p><ol>{route.legs.map((leg,i) => <li key={i}>{stops[i]?.name} → {stops[i+1]?.name} : {(leg.distance/1000).toFixed(1)} km · {minutes(leg.duration)}</li>)}</ol></div>}
      {google && <a href={google} target="_blank" rel="noreferrer">Ouvrir ce trajet dans Google Maps ↗</a>}
      <label>Nom du parcours<input value={name} onChange={e => setName(e.target.value)} maxLength={100} /></label>
      <div className="media-actions"><button className="button button-outline" disabled={busy || stops.length < 2 || name.trim().length < 2} onClick={() => void save()}>Enregistrer dans mon compte</button><button className="button button-outline" disabled={busy} onClick={() => void loadSaved()}>Mes parcours enregistrés</button></div>
      {savedLoaded && !saved.length && <p>Aucun parcours enregistré.</p>}
      {saved.map(journey => <div className="saved-journey" key={journey.id}><button onClick={() => { changeStops(journey.stops); setName(journey.name); }}>{journey.name} · {journey.stops.length} étapes</button><button disabled={busy} aria-label={`Supprimer ${journey.name}`} onClick={() => void removeSaved(journey.id)}>Supprimer</button></div>)}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="chat-error">{error}</p>}
    </div>
  </section>;
}
