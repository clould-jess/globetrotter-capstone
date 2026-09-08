"use client";
/* eslint-disable @next/next/no-img-element */

import { use } from "react";
import Link from "next/link";
import { DestinationChat } from "@/components/destination-chat";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { useDestinations } from "@/components/destination-provider";

export default function CommunityRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { destinations, loading } = useDestinations();
  const destination = destinations.find((item) => item.slug === slug);

  if (!destination) {
    return (
      <PageShell>
        <section className="container section auth-status-screen">
          <h1>{loading ? "Chargement…" : "Destination introuvable"}</h1>
          <Link className="button button-forest" href="/community">Voir les discussions</Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="community-room-hero">
        <img src={destination.image} alt={destination.name} />
        <span />
        <div className="container">
          <Link href="/community">← <T fr="Toutes les discussions" en="All discussions" /></Link>
          <p className="eyebrow light"><T fr={destination.region.fr} en={destination.region.en} /></p>
          <h1>{destination.name}</h1>
        </div>
      </section>
      <section className="container community-room-layout section-small">
        <aside>
          <p className="eyebrow"><T fr="Avant de publier" en="Before posting" /></p>
          <h2><T fr="Une communauté utile et respectueuse." en="A useful, respectful community." /></h2>
          <ul>
            <li><T fr="Partagez des informations vécues et précises." en="Share first-hand, precise information." /></li>
            <li><T fr="Respectez les communautés et les autres voyageurs." en="Respect communities and fellow travellers." /></li>
            <li><T fr="Ne publiez jamais de données personnelles." en="Never post personal information." /></li>
          </ul>
        </aside>
        <DestinationChat key={destination.slug} slug={destination.slug} destinationName={destination.name} />
      </section>
    </PageShell>
  );
}
