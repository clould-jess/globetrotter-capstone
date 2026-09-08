"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_BASE, responseMessage } from "@/lib/api";
import { DestinationChat } from "./destination-chat";

type Group = { id: string; name: string; description: string; member_count: number; joined: boolean };

export function CommunityGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Group | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/community/groups`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setGroups(await response.json());
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Groupes indisponibles."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/community/groups`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setActive(await response.json()); setName(""); setDescription(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création impossible."); }
    finally { setBusy(false); }
  }
  async function membership(group: Group, leave = false) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/community/groups/${group.id}/${leave ? "membership" : "join"}`, { method: leave ? "DELETE" : "POST", credentials: "include" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setActive(leave ? null : { ...group, joined: true }); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Action impossible."); }
    finally { setBusy(false); }
  }
  return <section className="community-groups">
    <p className="eyebrow">Voyager ensemble</p><h2>Vos groupes de voyageurs</h2>
    <p>Créez un groupe pour une sortie, une ville ou une passion. Les groupes sont visibles et ouverts à tous les comptes du site ; seuls les membres peuvent lire et publier dans leur salon. Ce ne sont pas des conversations privées.</p>
    <details><summary>Créer un groupe</summary><form className="group-form" onSubmit={create}>
      <label>Nom du groupe<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
      <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={400} rows={2} /></label>
      <button className="button button-sun" disabled={busy}>{busy ? "Création…" : "Créer et rejoindre"}</button>
    </form></details>
    {error && <p role="alert" className="chat-error">{error}</p>}
    {loading ? <p>Chargement des groupes…</p> : !groups.length && <p>Aucun groupe pour le moment. Créez le premier.</p>}
    <div className="group-grid">{groups.map(group => <article key={group.id}>
      <h3>{group.name}</h3><p>{group.description}</p><small>{group.member_count} membre(s)</small>
      <button className="button button-outline" disabled={busy} onClick={() => group.joined ? setActive(group) : void membership(group)}>{group.joined ? "Ouvrir le salon" : "Rejoindre le groupe"}</button>
    </article>)}</div>
    {active && <div className="group-conversation"><div className="group-heading"><h3>{active.name}</h3><button onClick={() => setActive(null)}>Fermer</button><button disabled={busy} onClick={() => { if (confirm("Quitter ce groupe ? Vos anciens messages seront conservés.")) void membership(active, true); }}>Quitter le groupe</button></div><DestinationChat key={active.id} slug={active.id} destinationName={active.name} /></div>}
    <p>Vous préférez discuter d’un lieu précis ? Retrouvez les salons de destination ci-dessous.</p>
  </section>;
}
