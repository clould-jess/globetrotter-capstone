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
      <section className="container messaging-page">
        <CommunityGroups />
        <h2 className="destination-discussions-title"><T fr="Discuter d’une destination" en="Discuss a destination" /></h2>
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
