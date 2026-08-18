/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { AddToItinerary } from "@/components/add-to-itinerary";
import { DestinationCard } from "@/components/destination-card";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { destinations, getDestination } from "@/lib/destinations";
import { tourismPlaces, tourismTypeIcons, tourismTypeLabels } from "@/lib/tourism";

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) notFound();
  const related = destinations.filter((item) => item.slug !== destination.slug).slice(0, 3);
  const nearby = tourismPlaces.filter((place) => place.destinationSlugs.includes(destination.slug)).slice(0, 3);

  return (
    <PageShell>
      <section className="detail-hero" style={{ "--destination-tone": destination.tone } as React.CSSProperties}>
        <img src={destination.image} alt={`${destination.name}, Cameroun`} />
        <div className="detail-overlay" />
        <div className="container detail-hero-copy">
          <Link href="/explore" className="back-link">← <T fr="Retour à l’exploration" en="Back to explore" /></Link>
          <p className="eyebrow light"><T fr={destination.region.fr} en={destination.region.en} /></p>
          <h1>{destination.name}</h1>
          <p><T fr={destination.summary.fr} en={destination.summary.en} /></p>
        </div>
      </section>

      <section className="detail-intro container">
        <div className="detail-story">
          <p className="eyebrow"><T fr="Pourquoi y aller" en="Why go" /></p>
          <h2><T fr="Une étape qui raconte le pays autrement." en="A place that tells another side of the country." /></h2>
          <p><T fr={destination.description.fr} en={destination.description.en} /></p>
          <AddToItinerary slug={destination.slug} />
        </div>
        <aside className="detail-facts">
          <div><span><T fr="Durée conseillée" en="Suggested stay" /></span><strong><T fr={destination.duration.fr} en={destination.duration.en} /></strong></div>
          <div><span><T fr="Période idéale" en="Best season" /></span><strong><T fr={destination.season.fr} en={destination.season.en} /></strong></div>
          <div><span><T fr="Région" en="Region" /></span><strong><T fr={destination.region.fr} en={destination.region.en} /></strong></div>
        </aside>
      </section>

      <section className="highlights-section">
        <div className="container">
          <p className="eyebrow light"><T fr="À ne pas manquer" en="Highlights" /></p>
          <div className="highlight-grid">
            {destination.highlights.map((highlight, index) => (
              <article key={highlight.fr}>
                <span>0{index + 1}</span>
                <h3><T fr={highlight.fr} en={highlight.en} /></h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="nearby-section section-small">
          <div className="container section-heading split-heading">
            <div>
              <p className="eyebrow"><T fr="Autour de cette étape" en="Around this stop" /></p>
              <h2><T fr="Où dormir, manger et sortir" en="Where to stay, eat and explore" /></h2>
            </div>
            <Link className="text-link" href="/guide"><T fr="Voir la carte complète" en="See the full map" /> →</Link>
          </div>
          <div className="container nearby-grid">
            {nearby.map((place) => (
              <article key={place.id}>
                <img src={place.image} alt={place.imageAlt.fr} loading="lazy" />
                <div>
                  <span>{tourismTypeIcons[place.type]} · <T fr={tourismTypeLabels[place.type].fr} en={tourismTypeLabels[place.type].en} /></span>
                  <h3>{place.name}</h3>
                  <p><T fr={place.summary.fr} en={place.summary.en} /></p>
                  <a href={place.sourceUrl} target="_blank" rel="noreferrer"><T fr="Informations" en="Details" /> ↗</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="detail-notes container section-small">
        <div>
          <p className="eyebrow"><T fr="Bien préparer l’étape" en="Prepare your visit" /></p>
          <h2><T fr="Voyager avec attention" en="Travel thoughtfully" /></h2>
        </div>
        <div className="note-grid">
          <article><strong>01</strong><p><T fr="Vérifiez les conditions locales et les accès avant tout déplacement." en="Check local conditions and access before travelling." /></p></article>
          <article><strong>02</strong><p><T fr="Privilégiez les guides, hébergements et artisans de la région." en="Choose guides, stays and artisans based in the region." /></p></article>
          <article><strong>03</strong><p><T fr="Respectez les lieux, les communautés et les consignes environnementales." en="Respect places, communities and environmental guidance." /></p></article>
        </div>
      </section>

      <section className="related-section section">
        <div className="container section-heading split-heading">
          <div><p className="eyebrow"><T fr="Continuez le voyage" en="Continue the journey" /></p><h2><T fr="D’autres horizons" en="More horizons" /></h2></div>
          <Link className="text-link" href="/explore"><T fr="Tout explorer" en="Explore all" /> →</Link>
        </div>
        <div className="container destination-grid">
          {related.map((item) => <DestinationCard key={item.slug} destination={item} />)}
        </div>
      </section>
    </PageShell>
  );
}
