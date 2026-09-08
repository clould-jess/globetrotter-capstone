"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type SessionUser } from "@/components/auth-provider";
import { API_BASE, responseMessage } from "@/lib/api";

type Mode = "login" | "register";

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { user, setUser } = useAuth();
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = mode === "register"
      ? {
          display_name: String(form.get("display_name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }
      : {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        };

    try {
      const response = await fetch(`${API_BASE}/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setUser(await response.json() as SessionUser);
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = new URL(requested || "/", window.location.origin);
      router.replace(destination.origin === window.location.origin ? destination.pathname + destination.search : "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La connexion a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-story">
        <Link className="brand account-brand" href="/" aria-label="Cameroon Project">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><b>CAMEROON</b><small>PROJECT</small></span>
        </Link>
        <div>
          <p className="eyebrow light">La communauté des voyageurs</p>
          <h1>Le Cameroun se raconte mieux ensemble.</h1>
          <p>Créez votre compte pour explorer les destinations, préparer votre voyage et échanger vos expériences avec d’autres visiteurs.</p>
        </div>
        <div className="account-benefits">
          <span>01 <b>Discussions par destination</b></span>
          <span>02 <b>Conseils de voyageurs</b></span>
          <span>03 <b>Itinéraire personnel</b></span>
        </div>
      </section>
      <section className="account-panel">
        <div className="account-card">
          {user ? (
            <div className="account-welcome">
              <span className="account-welcome-avatar">{user.display_name.slice(0, 1).toUpperCase()}</span>
              <p className="eyebrow">Compte actif</p>
              <h2>Bienvenue, {user.display_name}</h2>
              <p>Votre session est déjà ouverte.</p>
              <button type="button" className="button button-forest" onClick={() => router.replace("/")}>Entrer sur le site →</button>
            </div>
          ) : (
            <>
              <div className="account-tabs" role="tablist" aria-label="Type de connexion">
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }}>Connexion</button>
                <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(""); }}>Créer un compte</button>
              </div>
              <div className="account-heading">
                <p className="eyebrow">{mode === "login" ? "Bon retour" : "Rejoindre la communauté"}</p>
                <h2>{mode === "login" ? "Continuez votre voyage." : "Créez votre espace voyageur."}</h2>
              </div>
              <form className="account-form" onSubmit={submit}>
                {mode === "register" && (
                  <label>Nom affiché<input name="display_name" minLength={2} maxLength={80} autoComplete="name" required placeholder="Ex. Amina" /></label>
                )}
                <label>Adresse e-mail<input name="email" type="email" autoComplete="email" required placeholder="vous@exemple.com" /></label>
                <label>Mot de passe<input name="password" type="password" minLength={mode === "register" ? 10 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} required placeholder={mode === "register" ? "10 caractères minimum" : "Votre mot de passe"} /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="button button-sun" disabled={pending}>{pending ? "Un instant…" : mode === "login" ? "Se connecter →" : "Créer mon compte →"}</button>
              </form>
              <p className="account-privacy">Votre mot de passe est chiffré côté serveur et votre session reste dans un cookie inaccessible à JavaScript.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
