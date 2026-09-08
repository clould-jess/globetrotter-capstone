"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
  status: "active" | "disabled";
  created_at: string;
  last_seen_at: string | null;
};

type AuthContextValue = {
  user: SessionUser | null | undefined;
  setUser: (user: SessionUser | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_PATHS = new Set(["/account"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [connectionError, setConnectionError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  const refreshUser = useCallback(async () => {
    setConnectionError(false);
    try {
      const response = await fetch(`${API_BASE}/auth/session`, {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error("session_unavailable");
      setUser(await response.json() as SessionUser);
    } catch {
      setConnectionError(true);
      setUser(undefined);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshUser(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  useEffect(() => {
    if (!isPublicPath && user === null) {
      router.replace(`/account?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPublicPath, pathname, router, user]);

  const logout = useCallback(async () => {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Logout failed");
    setUser(null);
    router.replace("/account");
  }, [router]);

  const value = useMemo(
    () => ({ user, setUser, refreshUser, logout }),
    [logout, refreshUser, user],
  );

  if (!isPublicPath && connectionError) {
    return (
      <div className="auth-status-screen" role="alert">
        <span className="auth-status-mark">237</span>
        <h1>Service de connexion indisponible</h1>
        <p>Le site protège maintenant les espaces de voyage et de discussion. Vérifiez que la passerelle API est démarrée.</p>
        <button type="button" className="button button-forest" onClick={() => void refreshUser()}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!isPublicPath && user === undefined) {
    return (
      <div className="auth-status-screen" aria-live="polite">
        <span className="auth-spinner" aria-hidden="true" />
        <p>Vérification de votre compte…</p>
      </div>
    );
  }

  if (!isPublicPath && user === null) {
    return (
      <div className="auth-status-screen" aria-live="polite">
        <span className="auth-spinner" aria-hidden="true" />
        <p>Redirection vers la connexion…</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
