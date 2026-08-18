/* eslint-disable @next/next/no-img-element */
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { destinations } from "@/lib/destinations";
import { tourismPlaces } from "@/lib/tourism";

export default function CreditsPage() {
  return (
    <PageShell>
      <section className="credits-hero page-hero"><div className="container page-hero-inner"><p className="eyebrow light"><T fr="Transparence" en="Transparency" /></p><h1><T fr="Crédits photographiques" en="Photo credits" /></h1><p><T fr="Les photographies du site proviennent de Wikimedia Commons et sont utilisées avec leur licence et leur attribution." en="The site’s photographs come from Wikimedia Commons and are used with their licence and attribution." /></p></div></section>
      <section className="credits-list container section-small">
        <div className="credits-section-title"><p>01</p><h2><T fr="Destinations" en="Destinations" /></h2></div>
        {destinations.map((destination) => (
          <article key={destination.slug}>
            <img src={destination.image} alt={`${destination.name}, Cameroun`} loading="lazy" />
            <div><p>{destination.region.fr}</p><h2>{destination.name}</h2><span>{destination.credit} · {destination.license}</span></div>
            <a href={destination.imagePage} target="_blank" rel="noreferrer"><T fr="Voir la source ↗" en="View source ↗" /></a>
          </article>
        ))}
        <div className="credits-section-title"><p>02</p><h2><T fr="Hôtels, restaurants et activités" en="Hotels, restaurants and activities" /></h2></div>
        {tourismPlaces.map((place) => (
          <article key={place.id}>
            <img src={place.image} alt={place.imageAlt.fr} loading="lazy" />
            <div>
              <p>{place.imageKind === "place" ? <T fr="Photo du lieu" en="Place photo" /> : <T fr="Ambiance locale" en="Local context" />}</p>
              <h2>{place.name}</h2>
              <span>{place.imageCredit} · {place.imageLicense}</span>
            </div>
            <a href={place.imagePage} target="_blank" rel="noreferrer"><T fr="Voir la source ↗" en="View source ↗" /></a>
          </article>
        ))}
        <article>
          <img src="/places/kribi-guide.webp" alt="Plage de Kribi au Cameroun" loading="lazy" />
          <div><p><T fr="Page d’accueil" en="Homepage" /></p><h2><T fr="Plage de Kribi" en="Kribi beach" /></h2><span>Thits89 · CC BY-SA 3.0</span></div>
          <a href="https://commons.wikimedia.org/wiki/File:Beach_of_Kribi,_Cameroon.jpg" target="_blank" rel="noreferrer"><T fr="Voir la source ↗" en="View source ↗" /></a>
        </article>
        <article className="hero-credit-row"><div><p>Hero</p><h2>Mont Cameroun depuis Douala</h2><span>Edouard Tamba · CC0 1.0</span></div><a href="https://commons.wikimedia.org/wiki/File:Mount_Cameroon_from_Douala_Bessengu%C3%A9.jpg" target="_blank" rel="noreferrer"><T fr="Voir la source ↗" en="View source ↗" /></a></article>
        <article className="map-credit-row"><div><p>Carte / Map</p><h2>Régions du Cameroun</h2><span>Flappiefh · CC BY-SA 4.0</span></div><a href="https://commons.wikimedia.org/wiki/File:Cameroon_map_Lambert-AEA_administrative_with_regions-blank.svg" target="_blank" rel="noreferrer"><T fr="Voir la source ↗" en="View source ↗" /></a></article>
      </section>
    </PageShell>
  );
}
