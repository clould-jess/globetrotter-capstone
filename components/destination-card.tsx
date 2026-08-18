/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Destination } from "@/lib/destinations";
import { T } from "./t";

export function DestinationCard({ destination, priority = false }: { destination: Destination; priority?: boolean }) {
  return (
    <article className="destination-card">
      <Link href={`/destinations/${destination.slug}`} aria-label={`Découvrir ${destination.name}`}>
        <div className="destination-image">
          {/* A plain img keeps the project compatible with the deployment worker and remote CC imagery. */}
          <img src={destination.image} alt={`${destination.name}, Cameroun`} loading={priority ? "eager" : "lazy"} />
          <span className="destination-region"><T fr={destination.region.fr} en={destination.region.en} /></span>
        </div>
        <div className="destination-copy">
          <div>
            <h3>{destination.name}</h3>
            <p><T fr={destination.summary.fr} en={destination.summary.en} /></p>
          </div>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
      </Link>
    </article>
  );
}
