"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { destinations as staticDestinations, type Destination } from "@/lib/destinations";
import { useAuth } from "./auth-provider";

export type ManagedDestination = {
  slug: string;
  name: string;
  region_fr: string;
  region_en: string;
  summary_fr: string;
  summary_en: string;
  categories: Destination["categories"];
  image_url: string;
  published: boolean;
};

type DestinationContextValue = {
  destinations: Destination[];
  loading: boolean;
  refreshCatalog: () => Promise<void>;
};

const DestinationContext = createContext<DestinationContextValue | null>(null);

function mergeManagedDestinations(records: ManagedDestination[]): Destination[] {
  const recordsBySlug = new Map(records.map((record) => [record.slug, record]));
  const merged = staticDestinations
    .filter((destination) => recordsBySlug.get(destination.slug)?.published === true)
    .map((destination) => {
      const record = recordsBySlug.get(destination.slug);
      if (!record) return destination;
      return {
        ...destination,
        name: record.name,
        region: { fr: record.region_fr, en: record.region_en },
        summary: { fr: record.summary_fr, en: record.summary_en },
        categories: record.categories,
        image: record.image_url,
      };
    });

  const existing = new Set(merged.map((destination) => destination.slug));
  for (const record of records) {
    if (!record.published || existing.has(record.slug)) continue;
    merged.push({
      slug: record.slug,
      name: record.name,
      region: { fr: record.region_fr, en: record.region_en },
      zone: "city",
      categories: record.categories,
      summary: { fr: record.summary_fr, en: record.summary_en },
      description: { fr: record.summary_fr, en: record.summary_en },
      duration: { fr: "À préciser", en: "To be confirmed" },
      season: { fr: "Toute l’année", en: "Year-round" },
      image: record.image_url,
      imagePage: record.image_url,
      credit: "Cameroon Project",
      license: "Image fournie par l’administration",
      tone: "#17633d",
      highlights: [
        { fr: record.region_fr, en: record.region_en },
        { fr: "Conseils de la communauté", en: "Community advice" },
      ],
    });
  }
  return merged;
}

export function DestinationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>(staticDestinations);
  const [loading, setLoading] = useState(false);

  const refreshCatalog = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/discovery/destinations?limit=100`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      setDestinations(mergeManagedDestinations(await response.json() as ManagedDestination[]));
    } catch {
      // Keep the last successfully loaded catalogue if the network is unavailable.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshCatalog]);

  const value = useMemo(
    () => ({ destinations, loading, refreshCatalog }),
    [destinations, loading, refreshCatalog],
  );

  return <DestinationContext.Provider value={value}>{children}</DestinationContext.Provider>;
}

export function useDestinations() {
  const value = useContext(DestinationContext);
  if (!value) throw new Error("useDestinations must be used inside DestinationProvider");
  return value;
}
