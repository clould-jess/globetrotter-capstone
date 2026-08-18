"use client";

import { useEffect, useState } from "react";
import { T } from "./t";

const STORAGE_KEY = "cameroon-itinerary";
function readStops() {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as string[]; }
  catch { return []; }
}

export function AddToItinerary({ slug }: { slug: string }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAdded(readStops().includes(slug)));
    return () => window.cancelAnimationFrame(frame);
  }, [slug]);

  const toggle = () => {
    const saved = readStops();
    const next = saved.includes(slug) ? saved.filter((item) => item !== slug) : [...saved, slug];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAdded(next.includes(slug));
  };

  return (
    <button type="button" className={`button ${added ? "button-outline" : "button-sun"}`} onClick={toggle}>
      {added ? <T fr="✓ Ajouté à mon voyage" en="✓ Added to my trip" /> : <T fr="＋ Ajouter à mon voyage" en="＋ Add to my trip" />}
    </button>
  );
}
