import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { TourismExplorer } from "@/components/tourism-explorer";
import { tourismCities, tourismPlaces } from "@/lib/tourism";

export default function GuidePage() {
  return (
    <PageShell>
      <section className="guide-hero page-hero">
        <div className="container guide-hero-inner">
          <p className="eyebrow light"><T fr="Dormir · manger · découvrir" en="Stay · eat · explore" /></p>
          <h1><T fr="Tout pour profiter du voyage." en="Everything for an easy, joyful trip." /></h1>
          <p><T fr="Des adresses concrètes, des expériences choisies et une vraie carte pour organiser chaque journée." en="Real places, curated experiences and an interactive map to organise every day." /></p>
          <div className="guide-hero-stats">
            <div><strong>{tourismPlaces.length}</strong><span><T fr="lieux repérés" en="mapped places" /></span></div>
            <div><strong>{tourismCities.length}</strong><span><T fr="villes et étapes" en="cities and stops" /></span></div>
            <div><strong>3</strong><span><T fr="façons de profiter" en="ways to enjoy" /></span></div>
          </div>
        </div>
      </section>

      <section className="guide-intro container section-small">
        <div>
          <p className="eyebrow"><T fr="Le carnet pratique" en="The practical guide" /></p>
          <h2><T fr="Un séjour plus simple, du matin au soir." en="A smoother stay, from morning to night." /></h2>
        </div>
        <p><T fr="Filtrez les hôtels, restaurants et sorties. Sélectionnez une adresse pour centrer la carte, zoomez, puis ouvrez l’itinéraire. Les horaires, tarifs et conditions peuvent changer : confirmez toujours directement avant de réserver ou de vous déplacer." en="Filter hotels, restaurants and activities. Select a place to centre the map, zoom in, then open directions. Hours, rates and conditions can change, so always confirm directly before booking or travelling." /></p>
      </section>

      <section className="tourism-map-section container">
        <TourismExplorer />
      </section>

      <section className="comfort-section section-small">
        <div className="container">
          <div className="section-heading split-heading comfort-heading">
            <div>
              <p className="eyebrow light"><T fr="Voyager à l’aise" en="Travel with ease" /></p>
              <h2><T fr="Les bons réflexes sur place" en="Useful habits on the ground" /></h2>
            </div>
            <p><T fr="De petits repères qui rendent le séjour plus fluide et plus serein." en="Simple cues that make a stay smoother and calmer." /></p>
          </div>
          <div className="comfort-grid">
            <article><span>01</span><strong><T fr="Arrivée organisée" en="Plan your arrival" /></strong><p><T fr="Confirmez le transfert avec l’hébergement avant l’atterrissage et gardez son adresse disponible hors ligne." en="Confirm the transfer with your accommodation before landing and keep its address available offline." /></p></article>
            <article><span>02</span><strong><T fr="Déplacements clairs" en="Clear transport" /></strong><p><T fr="Privilégiez les chauffeurs ou transports recommandés par l’hébergement et convenez du trajet avant le départ." en="Prefer drivers or transport recommended by your accommodation and agree on the journey before leaving." /></p></article>
            <article><span>03</span><strong><T fr="Deux moyens de paiement" en="Two payment options" /></strong><p><T fr="Vérifiez l’acceptation des cartes et gardez une solution de secours adaptée aux petites dépenses." en="Check card acceptance and keep a suitable backup for small expenses." /></p></article>
            <article><span>04</span><strong><T fr="Programme souple" en="Flexible schedule" /></strong><p><T fr="Gardez du temps pour la météo, les trajets et les rencontres. Une bonne journée n’a pas besoin d’être surchargée." en="Leave room for weather, travel and encounters. A good day does not need to be overloaded." /></p></article>
            <article><span>05</span><strong><T fr="Guide local" en="Local guide" /></strong><p><T fr="Pour les montagnes, cascades et zones rurales, choisissez un accompagnateur reconnu dans la région." en="For mountains, waterfalls and rural areas, choose a guide recognised in the region." /></p></article>
            <article><span>06</span><strong><T fr="Vérification du jour" en="Same-day check" /></strong><p><T fr="Avant chaque sortie, confirmez horaires, accès et conditions locales auprès d’une source officielle ou de votre hébergement." en="Before every outing, confirm hours, access and local conditions with an official source or your accommodation." /></p></article>
          </div>
        </div>
      </section>

      <section className="guide-cta container section-small">
        <div>
          <p className="eyebrow"><T fr="Prêt à composer le séjour ?" en="Ready to shape the trip?" /></p>
          <h2><T fr="Choisissez les étapes, puis construisez votre itinéraire." en="Choose the stops, then build your itinerary." /></h2>
        </div>
        <div>
          <Link className="button button-forest" href="/explore"><T fr="Explorer les destinations" en="Explore destinations" /> →</Link>
          <Link className="text-link" href="/itinerary"><T fr="Ouvrir mon carnet" en="Open my trip" /> ↗</Link>
        </div>
      </section>
    </PageShell>
  );
}

