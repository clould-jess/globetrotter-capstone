"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import { API_BASE } from "@/lib/api";
import { tourismPlaces, type TouristPlace } from "@/lib/tourism";
import { useChatLanguage } from "@/lib/chat";
import { formatDistance, formatDuration, googleRouteLinks, mapCategories, normaliseSearch, type MapCategory } from "@/lib/maps";
import { ChatIcon } from "./chat-icons";
import { useAuth } from "./auth-provider";

type Stop = { name: string; lat: number; lng: number; approximate?: boolean };
type Place = Stop & { id: string; kind: string; address: string; source: string; distance_m: number };
type Route = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { distance: number; duration: number }[] };
type Journey = { id: string; name: string; stops: Stop[] };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/community${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) {
    const messages: Record<number, [string, string]> = {
      401: ["Reconnectez-vous pour continuer.", "Sign in again to continue."],
      404: ["Parcours introuvable. Créez un nouveau parcours.", "Journey not found. Create a new journey."],
      409: ["Limite de 50 parcours atteinte. Supprimez un ancien parcours.", "50-journey limit reached. Delete an old journey."],
      422: ["Aucun trajet routier trouvé, ou étapes invalides. Vérifiez les points choisis.", "No driving route found, or invalid stops. Check your selected points."],
      429: ["Service sollicité. Patientez quelques secondes et réessayez.", "Service busy. Wait a few seconds and retry."],
    };
    const pair = messages[response.status] ?? ["Service cartographique indisponible. Réessayez plus tard.", "Map service unavailable. Please retry later."];
    throw new Error(pair[document.documentElement.dataset.lang === "en" ? 1 : 0]);
  }
  return response.status === 204 ? undefined as T : response.json();
}

type MapProps = { active?: TouristPlace; places?: TouristPlace[]; onSelect?: (id: string) => void; immersive?: boolean };
export function RoadMap(props: MapProps) {
  const { user } = useAuth();
  return <RoadMapContent key={user?.id ?? "anonymous"} {...props} />;
}
function RoadMapContent({ active, places = tourismPlaces, onSelect, immersive = false }: MapProps) {
  const { t, language } = useChatLanguage();
  const panelId = useId();
  const [panel, setPanel] = useState<"explore" | "route" | "saved">("explore");
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [areaChanged, setAreaChanged] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  const searchCenter = useRef<{lat:number;lng:number} | null>(null);
  const gesture = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const operation = useRef(false);
  const controller = useRef<AbortController | null>(null);
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
  const [category, setCategory] = useState<MapCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("Mon parcours");
  const [saved, setSaved] = useState<Journey[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void import("leaflet").then(L => {
      if (disposed || !container.current) return;
      library.current = L;
      const instance = L.map(container.current, { center: [3.866, 11.517], zoom: 12, scrollWheelZoom: immersive, zoomControl: false });
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, referrerPolicy: "strict-origin-when-cross-origin", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance).on("tileerror", () => { if (!disposed) setTileError(true); });
      markers.current = L.layerGroup().addTo(instance);
      routeLine.current = L.layerGroup().addTo(instance);
      positionMarker.current = L.layerGroup().addTo(instance);
      instance.on("click", event => { setPoint({ name: `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`, lat: event.latlng.lat, lng: event.latlng.lng }); setPanel("explore"); setCollapsed(false); });
      instance.on("moveend", () => { const old = searchCenter.current, now = instance.getCenter(); if (old) setAreaChanged(Math.abs(old.lat-now.lat)+Math.abs(old.lng-now.lng) > .002); });
      setReady(true);
    }).catch(() => setError("Impossible de charger la carte."));
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    if (container.current) observer.observe(container.current);
    return () => { disposed = true; mounted.current = false; controller.current?.abort(); observer.disconnect(); map.current?.remove(); map.current = null; };
  }, [immersive]);

  useEffect(() => {
    if (!immersive) return;
    const viewport = window.visualViewport;
    const update = () => root.current?.style.setProperty("--map-height", `${viewport?.height ?? window.innerHeight}px`);
    update(); viewport?.addEventListener("resize", update);
    return () => viewport?.removeEventListener("resize", update);
  }, [immersive]);

  useEffect(() => {
    const L = library.current; const layer = markers.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const place of places.slice(0, 250)) {
      const marker = L.circleMarker([place.coordinates.lat, place.coordinates.lng], { radius: place.id === active?.id ? 9 : 5, color: "#123f31", fillOpacity: .85, bubblingMouseEvents: false });
      const label = document.createElement("span"); label.textContent = `${place.name} — position indicative`;
      marker.bindTooltip(label).on("click", () => { onSelect?.(place.id); setPoint({ name: place.name, ...place.coordinates, approximate: true }); setPanel("explore"); setCollapsed(false); }).addTo(layer);
    }
    for (const place of nearby) {
      const label = document.createElement("span"); label.textContent = place.name;
      L.circleMarker([place.lat, place.lng], { radius: 8, color: "#123f31", fillColor: "#f6c744", fillOpacity: 1, bubblingMouseEvents: false }).bindTooltip(label).on("click", () => { setPoint(place); setPanel("explore"); setCollapsed(false); }).addTo(layer);
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
      map.current.fitBounds(line.getBounds(), { paddingTopLeft: [24, 120], paddingBottomRight: [60, 24], animate: false });
    }
    stops.forEach((stop, i) => {
      const label = document.createElement("span"); label.textContent = `${i + 1}. ${stop.name}`;
      const isPosition = position && Math.abs(position.lat-stop.lat) < .00001 && Math.abs(position.lng-stop.lng) < .00001;
      L.marker([stop.lat, stop.lng], { title: `${i+1}. ${stop.name}`, bubblingMouseEvents: false, icon: L.divIcon({ className: "map-stop-marker" + (isPosition ? " is-position" : ""), html: `<span>${i+1}</span>`, iconSize: [30,30], iconAnchor: [15,15] }) }).bindTooltip(label).on("click", () => { setPanel("route"); setCollapsed(false); }).addTo(routeLine.current!);
    });
  }, [route, stops, ready, position]);

  function changeStops(next: Stop[]) { revision.current += 1; setStops(next); setRoute(null); setNotice(""); }
  function add(stop: Stop) {
    if (stops.length >= 10) { setError("Maximum 10 étapes par parcours."); return; }
    if (stops.some(p => Math.abs(p.lat-stop.lat) < .00001 && Math.abs(p.lng-stop.lng) < .00001)) { setError("Ce point est déjà dans le parcours."); return; }
    if (!stop.name.trim()) return;
    setError(""); changeStops([...stops, { ...stop, name: stop.name.trim() }]); setPoint(null); setPanel("route"); setCollapsed(false);
  }
  function locate() {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) { setError("La position nécessite HTTPS. Choisissez votre départ en cliquant sur la carte."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(result => {
      if (!mounted.current) return;
      const next = { name: "Ma position", lat: result.coords.latitude, lng: result.coords.longitude };
      setPosition(next); setPoint(next); setAccuracy(Math.round(result.coords.accuracy)); setLocating(false); setPanel("explore"); setCollapsed(false);
      const L = library.current;
      if (L && map.current && positionMarker.current) {
        positionMarker.current.clearLayers();
        L.circle([next.lat, next.lng], { radius: result.coords.accuracy, color: "#3477c4", weight: 1 }).addTo(positionMarker.current);
        L.circleMarker([next.lat, next.lng], { radius: 7, color: "#fff", fillColor: "#3477c4", fillOpacity: 1 }).addTo(positionMarker.current);
        map.current.setView([next.lat, next.lng], 14);
      }
    }, result => { if (mounted.current) { setLocating(false); setError(result.code === 1 ? "Position refusée. Vous pouvez choisir le départ sur la carte." : "Position indisponible. Réessayez à l’extérieur ou choisissez un point."); } }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
  async function task<T>(path: string, init?: RequestInit): Promise<T> {
    const nextController = new AbortController(); controller.current = nextController;
    const timer = window.setTimeout(() => nextController.abort(), 35000);
    try {
      const result = await api<T>(path, { ...init, signal: nextController.signal });
      if (!mounted.current) throw new DOMException("Unmounted", "AbortError");
      return result;
    } finally { clearTimeout(timer); if (controller.current === nextController) controller.current = null; }
  }
  function start() {
    if (operation.current) return false;
    operation.current = true; setBusy(true); setError(""); setNotice(""); return true;
  }
  function finish() { operation.current = false; if (mounted.current) setBusy(false); }
  function failure(caught: unknown) {
    if (mounted.current) setError(caught instanceof Error && caught.name !== "AbortError" ? caught.message : t("Demande expirée. Réessayez ; les étapes sont conservées.", "Request timed out. Retry; your stops are preserved."));
  }
  async function calculate() {
    if (stops.length < 2 || !start()) return;
    const version = revision.current;
    try { const result = await task<Route>("/maps/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stops: stops.map(({lat, lng}) => ({lat, lng})) }) }); if (version === revision.current) setRoute(result); }
    catch (caught) { if (version === revision.current) failure(caught); }
    finally { finish(); }
  }
  async function findPlaces(kind: MapCategory) {
    const center = map.current?.getCenter(); if (!center || !start()) return;
    setCategory(kind); setPanel("explore"); setCollapsed(false); setPoint(null); setQuery(""); setSearched(false); setNearby([]);
    if (center.lat < 1 || center.lat > 14 || center.lng < 8 || center.lng > 17) { setError(t("Déplacez la carte vers le Cameroun pour rechercher.", "Move the map to Cameroon to search.")); finish(); return; }
    searchCenter.current = {lat: center.lat, lng: center.lng}; setAreaChanged(false);
    try { const result = await task<{ places: Place[] }>("/maps/places?kind=" + kind + "&lat=" + center.lat + "&lng=" + center.lng); setNearby(result.places); setSearched(true); }
    catch (caught) { failure(caught); }
    finally { finish(); }
  }
  async function loadSaved() {
    setPanel("saved"); setCollapsed(false);
    if (!start()) return;
    try { setSaved(await task<Journey[]>("/journeys")); setSavedLoaded(true); }
    catch (caught) { failure(caught); }
    finally { finish(); }
  }
  async function save() {
    if (!start()) return;
    try {
      const result = await task<Journey>(journeyId ? "/journeys/" + journeyId : "/journeys", { method: journeyId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), stops }) });
      setJourneyId(result.id); setSaved(current => [result, ...current.filter(j => j.id !== result.id)]);
      setNotice(t("Parcours enregistré dans votre compte.", "Journey saved to your account."));
    } catch (caught) { failure(caught); setNotice(t("Après une coupure, vérifiez Mes parcours avant de réessayer.", "After a connection failure, check Saved before retrying.")); }
    finally { finish(); }
  }
  async function removeSaved(id: string) {
    if (!confirm(t("Supprimer ce parcours enregistré ?", "Delete this saved journey?")) || !start()) return;
    try { await task("/journeys/" + id, { method: "DELETE" }); setSaved(current => current.filter(j => j.id !== id)); if (journeyId === id) setJourneyId(null); }
    catch (caught) { failure(caught); }
    finally { finish(); }
  }
  function choose(next: Stop) {
    setPoint(next); setPanel("explore"); setCollapsed(false); map.current?.setView([next.lat, next.lng], 15, {animate:false});
  }
  function openSearch() { setPanel("explore"); setPoint(null); setCollapsed(false); searchInput.current?.focus(); }
  const results = useMemo(() => {
    const clean = normaliseSearch(query);
    return (clean ? tourismPlaces.filter(p => normaliseSearch(p.name + " " + p.city + " " + p.area.fr + " " + p.area.en).includes(clean)) : places).slice(0, 30);
  }, [query, places]);
  const nearbyResults = nearby.filter(p => normaliseSearch(p.name).includes(normaliseSearch(query)));
  const links = googleRouteLinks(stops);
  const title = panel === "route" ? t("Votre trajet", "Your journey") : panel === "saved" ? t("Mes parcours", "Saved journeys") : point ? t("Lieu sélectionné", "Selected place") : t("Explorer autour de vous", "Explore nearby");

  return <section ref={root} className={"road-map map-v4" + (immersive ? " map-immersive" : "")} aria-label={t("Carte et itinéraires", "Map and journeys")}>
    <header className="map-topbar">
      {immersive ? <Link href="/guide" aria-label={t("Retour au guide", "Back to guide")}><ChatIcon name="back" /></Link> : <span aria-hidden="true">⌖</span>}
      <h1>{t("Carte & itinéraires", "Map & journeys")}</h1>
      {immersive ? <button aria-label={t("Changer la langue", "Change language")} onClick={() => { const next = language === "fr" ? "en" : "fr"; document.documentElement.dataset.lang = next; document.documentElement.lang = next; try { localStorage.setItem("cameroon-language", next); } catch { /* Optional preference. */ } }}>{language === "fr" ? "EN" : "FR"}</button> : <Link href="/map" aria-label={t("Ouvrir la grande carte", "Open full map")}>↗</Link>}
    </header>
    <div className={"map-workspace" + (collapsed ? " is-collapsed" : expanded ? " is-expanded" : "")}>
      <div className="map-canvas-area">
        <div className="street-map" ref={container} aria-label={t("Carte interactive : cliquez pour choisir une étape", "Interactive map: click to choose a stop")} />
        <div className="map-search-tools">
          <label className="map-search-field"><ChatIcon name="search" /><span className="map-sr-only">{t("Rechercher un lieu au Cameroun", "Search for a place in Cameroon")}</span><input ref={searchInput} value={query} maxLength={120} placeholder={t("Rechercher un lieu au Cameroun", "Search for a place in Cameroon")} onFocus={() => { setPanel("explore"); setCollapsed(false); }} onChange={e => { setQuery(e.target.value); setPoint(null); setPanel("explore"); setCollapsed(false); }} />{query && <button aria-label={t("Effacer la recherche", "Clear search")} onClick={() => setQuery("")}><ChatIcon name="close" /></button>}</label>
          <div className="map-categories" aria-label={t("Catégories de lieux proches", "Nearby place categories")}>{mapCategories.map(item => <button key={item.id} disabled={!ready || busy} aria-pressed={category === item.id} onClick={() => void findPlaces(item.id)}>{t(item.fr, item.en)}</button>)}</div>
          {category && areaChanged && <button className="map-search-area" disabled={busy} onClick={() => void findPlaces(category)}>{t("Rechercher dans cette zone", "Search this area")}</button>}
        </div>
        <div className="map-navigation-controls"><button disabled={!ready} aria-label={t("Zoom avant", "Zoom in")} onClick={() => map.current?.zoomIn()}><ChatIcon name="plus" /></button><button disabled={!ready} aria-label={t("Zoom arrière", "Zoom out")} onClick={() => map.current?.zoomOut()}>−</button><button className="map-locate" disabled={!ready || locating} aria-label={locating ? t("Localisation en cours", "Locating") : t("Afficher ma position", "Show my location")} onClick={locate}>⌖</button></div>
        {!ready && <p className="map-loading" role="status">{error || t("Chargement de la carte…", "Loading map…")}</p>}
      </div>
      <section className="map-sheet" aria-label={title}>
        <button className="map-sheet-handle" aria-expanded={!collapsed} aria-controls={panelId} aria-label={collapsed ? t("Ouvrir le panneau", "Expand panel") : t("Replier le panneau", "Collapse panel")} onClick={() => { if (ignoreClick.current) { ignoreClick.current = false; return; } setCollapsed(v => !v); }} onPointerDown={e => { gesture.current = e.clientY; ignoreClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={e => { if (gesture.current !== null && Math.abs(e.clientY - gesture.current) > 35) { setCollapsed(e.clientY > gesture.current); ignoreClick.current = true; } gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }}><span /></button>
        <nav className="map-panel-nav" aria-label={t("Outils de carte", "Map tools")}><button aria-pressed={panel === "explore"} onClick={openSearch}>{t("Explorer", "Explore")}</button><button aria-pressed={panel === "route"} onClick={() => { setPanel("route"); setCollapsed(false); }}>{t("Trajet", "Journey")} {stops.length > 0 && <span>{stops.length}</span>}</button><button disabled={busy} aria-pressed={panel === "saved"} onClick={() => void loadSaved()}>{t("Mes parcours", "Saved")}</button></nav>
        {route && panel === "route" && !collapsed && <div className="map-sheet-summary" role="status"><strong>{formatDistance(route.distance, language)} · {formatDuration(route.duration)}</strong><small>{t("En voiture · hors trafic", "Driving · no traffic")}</small></div>}
        <div id={panelId} className="map-panel-body" hidden={collapsed}>
          <div className="map-panel-heading"><h2>{title}</h2><button className="map-expand-sheet" aria-label={expanded ? t("Réduire le panneau", "Reduce panel") : t("Agrandir le panneau", "Enlarge panel")} onClick={() => setExpanded(v => !v)}>{expanded ? "↓" : "↑"}</button></div>
          {tileError && <p className="map-warning" role="status">{t("Le fond de carte ne se charge pas complètement. Vérifiez la connexion ; les étapes restent accessibles.", "Map tiles are not fully loading. Check your connection; stops remain accessible.")}</p>}
          {error && <p className="map-error" role="alert">{error}</p>}{notice && <p className="map-notice" role="status">{notice}</p>}
          {panel === "explore" && <>
            {point ? <div className="map-point-detail"><label>{t("Nom du lieu", "Place name")}<input value={point.name} maxLength={120} onChange={e => setPoint({ ...point, name: e.target.value })} /></label><p>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>{point.approximate && <p className="map-warning">{t("Repère indicatif du catalogue. Vérifiez l’emplacement exact avant de partir.", "Approximate catalogue marker. Check the exact location before travelling.")}</p>}{position && position.lat === point.lat && position.lng === point.lng && <p>{t("Précision", "Accuracy")} ±{accuracy} m · {t("position ponctuelle, pas un suivi en direct", "one-time location, not live tracking")}</p>}<button className="map-primary" disabled={!point.name.trim() || busy} onClick={() => add(point)}>{t("Ajouter une étape", "Add stop")}</button><button className="map-secondary" disabled={!point.name.trim() || busy} onClick={() => { if (stops.length && !confirm(t("Remplacer le point de départ actuel ?", "Replace the current starting point?"))) return; if (stops.slice(1).some(p => Math.abs(p.lat-point.lat) < .00001 && Math.abs(p.lng-point.lng) < .00001)) { setError(t("Ce point est déjà une étape.", "This point is already a stop.")); return; } changeStops([{...point, name: point.name.trim()}, ...stops.slice(1)]); setPoint(null); setPanel("route"); }}>{t("Utiliser comme départ", "Use as start")}</button><button className="map-text-action" onClick={() => setPoint(null)}>{t("Retour aux résultats", "Back to results")}</button></div> : <>
              {!category && !query && <p>{t("Choisissez une catégorie pour trouver des lieux dans un rayon de 15 km, ou recherchez dans le catalogue.", "Choose a category to find places within 15 km, or search the catalogue.")}</p>}
              {busy && <div className="map-result-loading" role="status">{t("Recherche en cours…", "Searching…")}</div>}
              {category && searched && <><p>{nearbyResults.length} {t("lieux · distance à vol d’oiseau du centre recherché", "places · straight-line distance from searched centre")}{areaChanged ? t(" · la carte a été déplacée", " · map has moved") : ""}</p><ul className="map-results">{nearbyResults.map(p => <li key={p.id}><button onClick={() => choose(p)}><strong>{p.name}</strong><small>{p.address || t("Adresse non renseignée", "Address not supplied")} · {formatDistance(p.distance_m, language)}</small></button><a href={p.source} target="_blank" rel="noreferrer" aria-label={t("Source OpenStreetMap pour ", "OpenStreetMap source for ") + p.name}>↗</a></li>)}</ul>{!nearbyResults.length && <p>{t("Aucun lieu répertorié. Essayez une autre catégorie ou déplacez la carte.", "No listed places. Try another category or move the map.")}</p>}<small>{t("Données OpenStreetMap, couverture non exhaustive.", "OpenStreetMap data; coverage is not exhaustive.")}</small></>}
              {category && !busy && <button className="map-text-action" onClick={() => void findPlaces(category)}>{t("Rechercher dans cette zone", "Search this area")}</button>}
              {(!category || query) && <><h3>{t("Dans le catalogue", "In the catalogue")}</h3><ul className="map-results">{results.map(p => <li key={p.id}><button onClick={() => { onSelect?.(p.id); choose({name:p.name,...p.coordinates,approximate:true}); }}><strong>{p.name}</strong><small>{p.city} · {t("repère indicatif", "approximate marker")}</small><span>{t("Voir sur la carte", "Show on map")} →</span></button></li>)}</ul>{!results.length && <p>{t("Aucun résultat dans le catalogue. Essayez une ville ou choisissez un point sur la carte.", "No catalogue results. Try a city or choose a point on the map.")}</p>}</>}
            </>}
          </>}
          {panel === "route" && <>
            <ol className="map-route-stops">{stops.map((stop, index) => <li key={stop.lat + "-" + stop.lng}><span className="map-stop-number">{index + 1}</span><div className="map-stop-copy"><strong>{stop.name}</strong><small>{index === 0 ? t("Départ", "Start") : index === stops.length - 1 ? t("Arrivée", "Finish") : t("Étape", "Stop")}{stop.approximate ? t(" · indicatif", " · approximate") : ""}</small></div><div className="map-stop-actions"><button disabled={index === 0 || busy} aria-label={t("Monter ", "Move up ") + stop.name} onClick={() => { const next = [...stops]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; changeStops(next); }}>↑</button><button disabled={index === stops.length - 1 || busy} aria-label={t("Descendre ", "Move down ") + stop.name} onClick={() => { const next = [...stops]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; changeStops(next); }}>↓</button><button disabled={busy} aria-label={t("Retirer ", "Remove ") + stop.name} onClick={() => changeStops(stops.filter((_, n) => n !== index))}><ChatIcon name="close" /></button></div></li>)}</ol>
            {stops.length < 2 && <p>{t("Ajoutez un départ et une arrivée pour calculer le trajet.", "Add a start and a destination to calculate a route.")}</p>}
            <button className="map-text-action" disabled={stops.length >= 10 || busy} onClick={openSearch}><ChatIcon name="plus" />{t("Ajouter une étape", "Add a stop")}</button>
            {stops.some(p => p.approximate) && <p className="map-warning">{t("Certaines étapes ont une position indicative. Vérifiez leur emplacement avant le trajet.", "Some stops have approximate positions. Check their location before travelling.")}</p>}
            <button className="map-primary" disabled={busy || stops.length < 2} onClick={() => void calculate()}>{busy ? t("Traitement…", "Processing…") : t("Calculer le trajet en voiture", "Calculate driving route")}</button>
            {route && <div className="map-route-summary" role="status"><strong>{formatDistance(route.distance, language)} · {formatDuration(route.duration)}</strong><p>{t("Estimation en voiture, hors trafic, pauses et fermetures.", "Driving estimate excluding traffic, breaks and closures.")}</p><details><summary>{t("Détail des étapes", "Leg details")}</summary><ol>{route.legs.map((leg, i) => <li key={i}>{stops[i]?.name} → {stops[i + 1]?.name}<br />{formatDistance(leg.distance, language)} · {formatDuration(leg.duration)}</li>)}</ol></details></div>}
            {stops.length >= 2 && <><label>{t("Nom du parcours", "Journey name")}<input value={name} maxLength={100} disabled={busy} onChange={e => { setName(e.target.value); setNotice(""); }} /></label><button className={route ? "map-primary" : "map-secondary"} disabled={busy || name.trim().length < 2} onClick={() => void save()}>{journeyId ? t("Mettre à jour le parcours", "Update journey") : t("Enregistrer le parcours", "Save journey")}</button>{links.length > 1 && <p>{t("Google Maps : trajet découpé pour conserver toutes les étapes sur téléphone.", "Google Maps: split into parts to preserve every stop on mobile.")}</p>}{links.map(link => <a className="map-external-link" key={link.from} href={link.href} target="_blank" rel="noreferrer">{t("Ouvrir dans Google Maps", "Open in Google Maps")}{links.length > 1 ? " · " + link.from + "–" + link.to : ""} ↗</a>)}</>}
            {stops.length > 0 && <button className="map-text-action" disabled={busy} onClick={() => { if (confirm(t("Effacer les étapes affichées ? Les parcours enregistrés seront conservés.", "Clear the displayed stops? Saved journeys will be preserved."))) { changeStops([]); setName(t("Mon parcours", "My journey")); setJourneyId(null); } }}>{t("Nouveau parcours", "New journey")}</button>}
          </>}
          {panel === "saved" && <>{busy && <p role="status">{t("Chargement des parcours…", "Loading journeys…")}</p>}{savedLoaded && !saved.length && <p>{t("Aucun parcours enregistré. Préparez un trajet, donnez-lui un nom et enregistrez-le ici.", "No saved journeys. Plan a route, give it a name and save it here.")}</p>}<ul className="map-results">{saved.map(j => <li key={j.id}><button disabled={busy} onClick={() => { if (stops.length && !confirm(t("Remplacer les étapes affichées par ce parcours ?", "Replace the displayed stops with this journey?"))) return; changeStops(j.stops); setName(j.name); setJourneyId(j.id); setPanel("route"); if (j.stops.length) map.current?.fitBounds(j.stops.map(p => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 14, animate: false }); }}><strong>{j.name}</strong><small>{j.stops.length} {t("étapes", "stops")}</small></button><button disabled={busy} aria-label={t("Supprimer ", "Delete ") + j.name} onClick={() => void removeSaved(j.id)}><ChatIcon name="trash" /></button></li>)}</ul><button className="map-text-action" disabled={busy} onClick={() => void loadSaved()}>{t("Actualiser", "Refresh")}</button></>}
          <details className="map-privacy-note"><summary>{t("Données, position et confidentialité", "Data, location and privacy")}</summary><p>{t("Votre position est demandée uniquement à votre clic. La carte charge les fonds OpenStreetMap. La recherche transmet le centre de carte à Overpass ; le calcul transmet les étapes à OSRM. Pas de trafic ni de navigation guidée en direct.", "Your location is requested only when you click. Map tiles load from OpenStreetMap. Search sends the map centre to Overpass; routing sends stops to OSRM. No live traffic or turn-by-turn navigation.")}</p><p>{t("Enregistrez le parcours pour le retrouver après avoir quitté cette page. Les points du catalogue peuvent être approximatifs.", "Save the journey to find it after leaving this page. Catalogue positions may be approximate.")}</p></details>
        </div>
      </section>
    </div>
  </section>;
}
