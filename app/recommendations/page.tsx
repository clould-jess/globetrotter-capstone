"use client";

import { useMemo, useState } from "react";
import { DestinationCard } from "@/components/destination-card";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { destinations } from "@/lib/destinations";

const interests = [
  { key: "nature", icon: "◒", fr: "Nature", en: "Nature" },
  { key: "culture", icon: "◆", fr: "Culture", en: "Culture" },
  { key: "beach", icon: "≈", fr: "Plages", en: "Beaches" },
  { key: "adventure", icon: "△", fr: "Aventure", en: "Adventure" },
  { key: "city", icon: "▦", fr: "Vie urbaine", en: "City life" },
] as const;

export default function RecommendationsPage() {
  const [selected, setSelected] = useState<string[]>(["nature"]);
  const [pace, setPace] = useState<"slow" | "balanced" | "intense">("balanced");
  const recommendations = useMemo(() => {
    return [...destinations]
      .map((destination, index) => ({
        destination,
        score: destination.categories.filter((category) => selected.includes(category)).length * 10 - index,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, pace === "slow" ? 2 : 3)
      .map((item) => item.destination);
  }, [pace, selected]);

  const toggle = (key: string) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return (
    <PageShell>
      <section className="recommendation-hero page-hero">
        <div className="container recommendation-title">
          <p className="eyebrow light"><T fr="Votre boussole personnelle" en="Your personal compass" /></p>
          <h1><T fr="Quel voyage vous ressemble ?" en="Which journey fits you?" /></h1>
          <p><T fr="Deux choix suffisent pour faire émerger une sélection." en="Two quick choices reveal a curated selection." /></p>
        </div>
      </section>

      <section className="quiz-section container section-small">
        <div className="quiz-block">
          <div className="quiz-title"><span>01</span><div><h2><T fr="Qu’est-ce qui vous attire ?" en="What draws you in?" /></h2><p><T fr="Choisissez une ou plusieurs envies." en="Choose one or more interests." /></p></div></div>
          <div className="interest-grid">
            {interests.map((interest) => (
              <button type="button" key={interest.key} className={selected.includes(interest.key) ? "is-selected" : ""} onClick={() => toggle(interest.key)} aria-pressed={selected.includes(interest.key)}>
                <span>{interest.icon}</span><strong><T fr={interest.fr} en={interest.en} /></strong>
              </button>
            ))}
          </div>
        </div>
        <div className="quiz-block pace-block">
          <div className="quiz-title"><span>02</span><div><h2><T fr="Quel rythme préférez-vous ?" en="What pace suits you?" /></h2><p><T fr="Ajustez la taille de la sélection." en="Adjust the size of your selection." /></p></div></div>
          <div className="pace-options">
            {([
              ["slow", "Prendre son temps", "Take it slow"],
              ["balanced", "Équilibré", "Balanced"],
              ["intense", "Voir un maximum", "See more"],
            ] as const).map(([key, fr, en]) => (
              <button type="button" className={pace === key ? "is-selected" : ""} key={key} onClick={() => setPace(key)}><T fr={fr} en={en} /></button>
            ))}
          </div>
        </div>
      </section>

      <section className="recommendation-results section-small">
        <div className="container">
          <div className="results-heading recommendation-heading"><div><p className="eyebrow"><T fr="Votre sélection" en="Your selection" /></p><h2><T fr="Ces horizons devraient vous plaire" en="These places should inspire you" /></h2></div><span>{recommendations.length} <T fr="suggestions" en="suggestions" /></span></div>
          <div className="destination-grid">
            {recommendations.map((destination) => <DestinationCard key={destination.slug} destination={destination} />)}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
