"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { useDestinations } from "@/components/destination-provider";
import { CommunityGroups } from "@/components/community-groups";

export default function CommunityPage() {
  const { destinations } = useDestinations();

  return (
    <PageShell>
      <section className="page-hero community-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow light"><T fr="Carnets partagés" en="Shared travel notes" /></p>
          <h1><T fr="La communauté des voyageurs" en="The traveller community" /></h1>
          <p><T fr="Choisissez une destination et échangez conseils, souvenirs et bonnes adresses avec les autres membres." en="Choose a destination and share tips, memories and favourite places with other members." /></p>
        </div>
      </section>
      <section className="container section-small">
        <CommunityGroups />
        <div className="community-room-grid">
          {destinations.map((destination) => (
            <Link className="community-room-card" href={`/community/${destination.slug}`} key={destination.slug}>
              <img src={destination.image} alt="" loading="lazy" />
              <span className="community-room-shade" />
              <span className="community-room-copy">
                <small><T fr={destination.region.fr} en={destination.region.en} /></small>
                <strong>{destination.name}</strong>
                <em><T fr="Entrer dans la discussion →" en="Join the discussion →" /></em>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
