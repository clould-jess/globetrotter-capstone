"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_BASE, responseMessage } from "@/lib/api";
import { useAuth } from "./auth-provider";

type Review = { id: string; user_id: string; display_name: string; rating: number; body: string; created_at: string };
type Reviews = { count: number; average: number | null; reviews: Review[] };

export function PlaceReviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<Reviews | null>(null);
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/community/reviews/${slug}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setData(await response.json());
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Avis indisponibles."); }
  }, [slug]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_BASE}/community/reviews/${slug}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: Number(rating), body }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setBody(""); setNotice("Merci ! Votre avis a été enregistré."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    try {
      const response = await fetch(`${API_BASE}/community/reviews/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(await responseMessage(response));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Suppression impossible."); }
  }
  return <section className="place-reviews">
    <h3>Avis et retours d’expérience</h3>
    <p>{data ? `${data.average?.toFixed(1) ?? "—"} / 5 · ${data.count} avis` : "Chargement des avis…"}</p>
    <form onSubmit={save} className="review-form">
      <label>Votre note<select value={rating} onChange={e => setRating(e.target.value)}>{[5,4,3,2,1].map(n => <option value={n} key={n}>{n} / 5</option>)}</select></label>
      <label>Votre expérience<textarea value={body} onChange={e => setBody(e.target.value)} minLength={5} maxLength={1000} required rows={3} placeholder="Ce qui vous a plu, ce qui pourrait être amélioré…" /></label>
      <small>Un avis par personne et par lieu. Un nouvel envoi remplace votre avis précédent.</small>
      <button className="button button-forest" disabled={busy || body.trim().length < 5}>{busy ? "Enregistrement…" : "Publier mon avis"}</button>
    </form>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="chat-error">{error}</p>}
    {data?.reviews.map(review => <article className="review-card" key={review.id}>
      <strong>{review.display_name}</strong><span aria-label={`${review.rating} sur 5`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span>
      <p>{review.body}</p><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("fr-FR")}</time>
      {(review.user_id === user?.id || user?.role === "admin") && <button type="button" onClick={() => void remove(review.id)}>Supprimer</button>}
    </article>)}
  </section>;
}
