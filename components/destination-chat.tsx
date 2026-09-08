"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, responseMessage } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { T } from "./t";
import { MediaComposer } from "./media-composer";
import { PlaceReviews } from "./place-reviews";

type ChatMessage = {
  id: string;
  destination_slug: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
  media_kind?: "image" | "audio" | null;
};

export function DestinationChat({ slug, destinationName }: { slug: string; destinationName: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/community/rooms/${encodeURIComponent(slug)}/messages?limit=80`,
        { credentials: "include", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      setMessages(await response.json() as ChatMessage[]);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Discussion indisponible.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadMessages(), 0);
    const refreshTimer = window.setInterval(() => void loadMessages(true), 5000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadMessages]);

  useEffect(() => {
    if (followBottom.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/community/rooms/${encodeURIComponent(slug)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: cleanBody }),
        },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      const message = await response.json() as ChatMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setBody("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Votre message n’a pas été envoyé.");
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(messageId: string) {
    if (!window.confirm("Supprimer ce message et son éventuel fichier ?")) return;
    try {
    const response = await fetch(`${API_BASE}/community/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setMessages((current) => current.filter((message) => message.id !== messageId));
    } else {
      setError(await responseMessage(response));
    }
    } catch { setError("Suppression impossible. Vérifiez votre connexion."); }
  }

  return (
    <div className="destination-chat">
      <div className="chat-head">
        <div>
          <span className="chat-live-dot" aria-hidden="true" />
          <small><T fr="Salon de discussion" en="Discussion room" /></small>
          <h3>{destinationName}</h3>
        </div>
        <p>{messages.length} <T fr="message(s) récent(s)" en="recent message(s)" /></p>
      </div>
      <div className="chat-messages" ref={listRef} onScroll={() => { const el = listRef.current; if (el) followBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; }} aria-live="polite">
        {loading ? (
          <p className="chat-empty"><T fr="Chargement de la discussion…" en="Loading discussion…" /></p>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <strong><T fr="Soyez la première personne à partager une expérience." en="Be the first to share an experience." /></strong>
            <span><T fr="Une adresse, un conseil, un souvenir : tout commence ici." en="A place, a tip, a memory: it starts here." /></span>
          </div>
        ) : messages.map((message) => {
          const ownMessage = message.user_id === user?.id;
          return (
            <article className={ownMessage ? "chat-message is-own" : "chat-message"} key={message.id}>
              <span className="chat-avatar" aria-hidden="true">{message.display_name.slice(0, 1).toUpperCase()}</span>
              <div>
                <header>
                  <strong>{message.display_name}</strong>
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </header>
                <p>{message.body}</p>
                {message.media_kind === "image" && <a href={`${API_BASE}/community/media/${message.id}`} target="_blank" rel="noreferrer"><img className="chat-photo" src={`${API_BASE}/community/media/${message.id}`} alt={message.body || `Photo partagée par ${message.display_name}`} loading="lazy" /></a>}
                {message.media_kind === "audio" && <audio className="chat-audio" controls preload="none" src={`${API_BASE}/community/media/${message.id}`} aria-label={`Vocal de ${message.display_name}`} />}
                {(ownMessage || user?.role === "admin") && (
                  <button type="button" onClick={() => void removeMessage(message.id)}>
                    <T fr="Supprimer" en="Delete" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label htmlFor={`chat-${slug}`} className="sr-only"><T fr="Votre message" en="Your message" /></label>
        <textarea
          id={`chat-${slug}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          rows={3}
          required
          placeholder="Partagez un conseil ou votre expérience sur ce lieu…"
        />
        <div>
          <span>{body.length}/1000</span>
          <button type="submit" className="button button-sun" disabled={sending || !body.trim()}>
            {sending ? <T fr="Envoi…" en="Sending…" /> : <T fr="Publier" en="Post" />}
          </button>
        </div>
      </form>
      <MediaComposer key={slug} slug={slug} onSent={() => { followBottom.current = true; void loadMessages(true); }} />
      {error && <p className="chat-error" role="alert">{error}</p>}
      {!slug.startsWith("group-") && <PlaceReviews key={slug} slug={slug} />}
    </div>
  );
}
