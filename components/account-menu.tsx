"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { T } from "./t";
import { useState } from "react";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;

  return (
    <div className="account-menu">
      <button type="button" className="account-avatar" aria-label="Menu du compte" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {user.display_name.slice(0, 1).toUpperCase()}
      </button>
      <div className={`account-popover ${open ? "is-open" : ""}`}>
        <strong>{user.display_name}</strong>
        <small>{user.role === "admin" ? "Administrateur" : "Voyageur"}</small>
        <Link href="/community"><T fr="Discussions" en="Community" /></Link>
        {user.role === "admin" && <Link href="/admin"><T fr="Tableau de bord" en="Dashboard" /></Link>}
        <button type="button" onClick={() => void logout().catch(() => setError("Déconnexion impossible. Réessayez."))}><T fr="Se déconnecter" en="Sign out" /></button>
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
