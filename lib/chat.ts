"use client";
import { useCallback, useSyncExternalStore } from "react";
import { API_BASE } from "./api";

export type ChatMessage = {
  id: string; destination_slug: string; user_id: string; display_name: string;
  body: string; created_at: string; media_kind?: "image" | "audio" | null;
  reply_to?: string | null; is_reply?: boolean;
  reply?: Pick<ChatMessage, "id" | "display_name" | "body" | "media_kind"> | null;
};
export type ChatGroup = {
  id: string; name: string; description: string; owner_id: string;
  is_private: boolean; member_count: number; joined: boolean;
};
const languageListeners = new Set<() => void>();
let languageObserver: MutationObserver | undefined;
function subscribe(callback: () => void) {
  languageListeners.add(callback);
  if (!languageObserver) {
    languageObserver = new MutationObserver(() => languageListeners.forEach(notify => notify()));
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lang"] });
  }
  return () => {
    languageListeners.delete(callback);
    if (!languageListeners.size) { languageObserver?.disconnect(); languageObserver = undefined; }
  };
}
export function useChatLanguage() {
  const language = useSyncExternalStore(subscribe, () => document.documentElement.dataset.lang === "en" ? "en" : "fr", () => "fr");
  const t = useCallback((fr: string, en: string) => language === "en" ? en : fr, [language]);
  return { language, t };
}
export async function chatRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/community${path}`, { ...init, credentials: "include", cache: "no-store" });
  if (!response.ok) {
    const language = document.documentElement.dataset.lang;
    const messages: Record<number, [string, string]> = {
      401: ["Reconnectez-vous pour continuer.", "Sign in again to continue."],
      403: ["Cette action n’est pas autorisée pour votre compte.", "This action is not allowed for your account."],
      404: ["Contenu inaccessible ou invitation expirée/révoquée.", "Content unavailable or invitation expired/revoked."],
      409: ["Action impossible : transférez le rôle de responsable avant de quitter, ou vérifiez la limite du groupe.", "Cannot complete this action: transfer ownership before leaving or check the group limit."],
      413: ["Fichier trop volumineux ou quota atteint.", "File too large or storage quota reached."],
      422: ["Vérifiez les champs et le format du fichier. Le message cité a peut-être été supprimé.", "Check the fields and file format. The quoted message may have been deleted."],
      429: ["Trop de tentatives. Patientez avant de réessayer.", "Too many attempts. Wait before trying again."],
    };
    const pair = messages[response.status] ?? ["Service indisponible. Réessayez dans un instant.", "Service unavailable. Try again shortly."];
    const error = new Error(pair[language === "en" ? 1 : 0]) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
export const chatJson = (data: unknown, method = "POST"): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
