"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth, type SessionUser } from "./auth-provider";
import { useDestinations, type ManagedDestination } from "./destination-provider";
import { API_BASE, responseMessage } from "@/lib/api";
import { T } from "./t";

type UserStats = {
  total_users: number;
  active_users_24h: number;
  new_users_7d: number;
  admin_users: number;
};

type CommunityStats = {
  total_messages: number;
  messages_24h: number;
  active_rooms: number;
};

type DestinationDraft = ManagedDestination & { categoriesText: string };

const emptyDraft: DestinationDraft = {
  slug: "",
  name: "",
  region_fr: "",
  region_en: "",
  summary_fr: "",
  summary_en: "",
  categories: ["nature"],
  categoriesText: "nature",
  image_url: "",
  published: false,
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(await responseMessage(response));
  return response.json() as Promise<T>;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { refreshCatalog } = useDestinations();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [managedDestinations, setManagedDestinations] = useState<ManagedDestination[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [draft, setDraft] = useState<DestinationDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (user?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const [nextUserStats, nextCommunityStats, nextUsers, nextDestinations] = await Promise.all([
        getJson<UserStats>(`${API_BASE}/admin/user-stats`),
        getJson<CommunityStats>(`${API_BASE}/admin/community-stats`),
        getJson<SessionUser[]>(`${API_BASE}/users?limit=12`),
        getJson<ManagedDestination[]>(`${API_BASE}/discovery/admin/destinations?limit=100`),
      ]);
      setUserStats(nextUserStats);
      setCommunityStats(nextCommunityStats);
      setUsers(nextUsers);
      setManagedDestinations(nextDestinations);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Le tableau de bord est indisponible.");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  function selectDestination(destination: ManagedDestination) {
    setSelectedSlug(destination.slug);
    setDraft({ ...destination, categoriesText: destination.categories.join(", ") });
    setNotice("");
  }

  function chooseDestination(slug: string) {
    if (!slug) {
      setSelectedSlug("");
      setDraft(emptyDraft);
      setNotice("");
      return;
    }
    const destination = managedDestinations.find((item) => item.slug === slug);
    if (destination) selectDestination(destination);
  }

  async function saveDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const categories = draft.categoriesText
      .split(",")
      .map((category) => category.trim())
      .filter((category): category is ManagedDestination["categories"][number] =>
        ["nature", "culture", "beach", "adventure", "city"].includes(category),
      );
    const payload = {
      name: draft.name,
      region_fr: draft.region_fr,
      region_en: draft.region_en,
      summary_fr: draft.summary_fr,
      summary_en: draft.summary_en,
      categories,
      image_url: draft.image_url,
      published: draft.published,
      ...(!selectedSlug ? { slug: draft.slug } : {}),
    };
    try {
      const response = await fetch(
        selectedSlug
          ? `${API_BASE}/discovery/admin/destinations/${encodeURIComponent(selectedSlug)}`
          : `${API_BASE}/discovery/admin/destinations`,
        {
          method: selectedSlug ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      const saved = await response.json() as ManagedDestination;
      setSelectedSlug(saved.slug);
      setDraft({ ...saved, categoriesText: saved.categories.join(", ") });
      setNotice("Les changements sont publiés dans le catalogue.");
      await Promise.all([loadDashboard(), refreshCatalog()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La mise à jour a échoué.");
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="admin-access-denied">
        <span>403</span>
        <h2><T fr="Accès administrateur requis" en="Administrator access required" /></h2>
        <p><T fr="Votre compte peut participer aux discussions, mais il ne peut pas modifier le site." en="Your account can join discussions but cannot edit the website." /></p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="admin-stat-grid" aria-busy={loading}>
        <article><span>Utilisateurs</span><strong>{userStats?.total_users ?? "—"}</strong><small>{userStats?.new_users_7d ?? 0} nouveaux cette semaine</small></article>
        <article><span>Actifs aujourd’hui</span><strong>{userStats?.active_users_24h ?? "—"}</strong><small>au cours des dernières 24 h</small></article>
        <article><span>Messages</span><strong>{communityStats?.total_messages ?? "—"}</strong><small>{communityStats?.messages_24h ?? 0} aujourd’hui</small></article>
        <article><span>Salons actifs</span><strong>{communityStats?.active_rooms ?? "—"}</strong><small>destinations avec échanges</small></article>
      </section>

      <div className="admin-main-grid">
        <section className="admin-panel admin-content-editor">
          <header>
            <div><p className="eyebrow">Contenu du site</p><h2>Mettre à jour une destination</h2></div>
            <select value={selectedSlug} onChange={(event) => chooseDestination(event.target.value)} aria-label="Destination à modifier">
              <option value="">+ Nouvelle destination</option>
              {managedDestinations.map((destination) => <option value={destination.slug} key={destination.slug}>{destination.name}</option>)}
            </select>
          </header>
          <form className="admin-destination-form" onSubmit={saveDestination}>
            <label>Identifiant URL<input value={draft.slug} disabled={Boolean(selectedSlug)} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} minLength={2} maxLength={80} required /></label>
            <label>Nom<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={120} required /></label>
            <div className="admin-form-row">
              <label>Région (FR)<input value={draft.region_fr} onChange={(event) => setDraft((current) => ({ ...current, region_fr: event.target.value }))} required /></label>
              <label>Region (EN)<input value={draft.region_en} onChange={(event) => setDraft((current) => ({ ...current, region_en: event.target.value }))} required /></label>
            </div>
            <label>Résumé français<textarea value={draft.summary_fr} onChange={(event) => setDraft((current) => ({ ...current, summary_fr: event.target.value }))} minLength={10} maxLength={500} rows={3} required /></label>
            <label>English summary<textarea value={draft.summary_en} onChange={(event) => setDraft((current) => ({ ...current, summary_en: event.target.value }))} minLength={10} maxLength={500} rows={3} required /></label>
            <label>URL de l’image<input type="url" value={draft.image_url} onChange={(event) => setDraft((current) => ({ ...current, image_url: event.target.value }))} required /></label>
            <label>Catégories<input value={draft.categoriesText} onChange={(event) => setDraft((current) => ({ ...current, categoriesText: event.target.value }))} placeholder="nature, culture, adventure" required /><small>nature, culture, beach, adventure ou city — séparées par des virgules</small></label>
            <label className="admin-publish-toggle"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} /><span>Visible sur le site</span></label>
            <div className="admin-form-actions">
              <button className="button button-sun" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les changements"}</button>
              {notice && <p role="status">{notice}</p>}
            </div>
          </form>
        </section>

        <section className="admin-panel admin-users-panel">
          <header><div><p className="eyebrow">Audience</p><h2>Membres récents</h2></div><span>{userStats?.admin_users ?? 0} admin.</span></header>
          <div className="admin-user-list">
            {users.map((member) => (
              <article key={member.id}>
                <span>{member.display_name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{member.display_name}</strong><small>{member.email}</small></div>
                <div><b>{member.role}</b><time dateTime={member.created_at}>{new Date(member.created_at).toLocaleDateString("fr-FR")}</time></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
