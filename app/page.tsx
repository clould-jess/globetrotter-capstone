/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DestinationCard } from "@/components/destination-card";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";
import { destinations } from "@/lib/destinations";

export default function Home() {
  return (
    <PageShell>
      <section className="hero-home">
        <img
          className="hero-background"
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Mount_Cameroon_from_Douala_Bessengu%C3%A9.jpg/1280px-Mount_Cameroon_from_Douala_Bessengu%C3%A9.jpg"
          alt="Mont Cameroun aperçu au coucher du soleil"
        />
        <div className="hero-shade" />
        <div className="hero-pattern" aria-hidden="true" />
        <div className="hero-content container">
          <p className="hero-kicker"><span className="hero-kicker-line" aria-hidden="true" /> <T fr="Bienvenue au Cameroun" en="Welcome to Cameroon" /></p>
          <h1>
            <T fr="Toute l’Afrique," en="All of Africa," />
            <em><T fr="dans un seul voyage." en="in one journey." /></em>
          </h1>
          <p className="hero-lead">
            <T
              fr="De l’Atlantique au Sahel, composez un voyage vivant entre paysages, cultures et rencontres."
              en="From the Atlantic to the Sahel, shape a vivid journey through landscapes, cultures and encounters."
            />
          </p>
          <div className="hero-actions">
            <Link className="button button-sun" href="/explore">
              <T fr="Explorer le Cameroun" en="Explore Cameroon" /><span>↗</span>
            </Link>
            <Link className="text-link light-link" href="/recommendations">
              <T fr="Je cherche l’inspiration" en="Help me choose" /> <span>→</span>
            </Link>
          </div>
        </div>
        <div className="hero-foot container">
          <p><strong>10</strong><T fr=" régions" en=" regions" /></p>
          <p><strong>2</strong><T fr=" langues officielles" en=" official languages" /></p>
          <p><strong>∞</strong><T fr=" façons de découvrir" en=" ways to explore" /></p>
        </div>
      </section>

      <section className="intro-section section container">
        <div className="intro-number">237</div>
        <div className="intro-copy">
          <p className="eyebrow"><T fr="L’Afrique en miniature" en="Africa in miniature" /></p>
          <h2>
            <T
              fr="Un territoire qui change de visage à chaque étape."
              en="A country that changes character at every turn."
            />
          </h2>
          <p>
            <T
              fr="Le Cameroun réunit littoral, forêts équatoriales, hauts plateaux, savanes et reliefs volcaniques. Ce guide transforme cette diversité en expériences simples à comprendre et faciles à organiser."
              en="Cameroon brings together coast, equatorial forest, highlands, savanna and volcanic landscapes. This guide turns that diversity into experiences that are clear and easy to plan."
            />
          </p>
          <Link className="text-link" href="/explore"><T fr="Voir les régions" en="See the regions" /> <span>→</span></Link>
        </div>
      </section>

      <section className="featured-section section">
        <div className="container section-heading split-heading">
          <div>
            <p className="eyebrow"><T fr="Sélection du moment" en="Editor’s selection" /></p>
            <h2><T fr="Des horizons qui marquent" en="Places that stay with you" /></h2>
          </div>
          <Link className="text-link" href="/explore"><T fr="Tout explorer" en="Explore all" /> <span>→</span></Link>
        </div>
        <div className="container destination-grid">
          {destinations.slice(0, 3).map((destination, index) => (
            <DestinationCard key={destination.slug} destination={destination} priority={index === 0} />
          ))}
        </div>
      </section>

      <section className="tourism-teaser">
        <div className="tourism-teaser-visual">
          <img src="/places/kribi-guide.webp" alt="Plage rocheuse de Kribi au Cameroun" loading="lazy" />
          <div className="tourism-teaser-label"><span>237</span><T fr="Votre carnet pratique" en="Your practical guide" /></div>
        </div>
        <div className="tourism-teaser-copy">
          <p className="eyebrow light"><T fr="Sur place, tout devient simple" en="Everything you need on the ground" /></p>
          <h2><T fr="Dormir, bien manger, s’amuser." en="Stay, eat well, enjoy more." /></h2>
          <p><T fr="Retrouvez des hôtels, des restaurants, des visites et une carte interactive pour organiser chaque étape sans perdre de temps." en="Find hotels, restaurants, activities and an interactive map to organise each stop without wasting time." /></p>
          <div className="tourism-teaser-services">
            <article><span>⌂</span><div><strong><T fr="Hôtels" en="Hotels" /></strong><small><T fr="Des bases confortables" en="Comfortable bases" /></small></div></article>
            <article><span>◒</span><div><strong><T fr="Restaurants" en="Restaurants" /></strong><small><T fr="Saveurs d’ici et d’ailleurs" en="Local and global flavours" /></small></div></article>
            <article><span>✦</span><div><strong><T fr="Sorties" en="Activities" /></strong><small><T fr="Culture, nature et détente" en="Culture, nature and leisure" /></small></div></article>
          </div>
          <Link className="button button-sun" href="/guide"><T fr="Ouvrir le guide touristique" en="Open the travel guide" /> →</Link>
        </div>
      </section>

      <section className="journey-section section container">
        <div className="section-heading centered-heading">
          <p className="eyebrow"><T fr="Choisissez votre rythme" en="Choose your rhythm" /></p>
          <h2><T fr="Quel Cameroun vous appelle ?" en="Which Cameroon is calling?" /></h2>
        </div>
        <div className="journey-grid">
          <Link href="/explore?category=adventure" className="journey-tile journey-green">
            <span className="tile-index">01</span>
            <div className="tile-symbol mountain-symbol" aria-hidden="true"><i /><i /><i /></div>
            <h3><T fr="Prendre de la hauteur" en="Climb higher" /></h3>
            <p><T fr="Volcans, hauts plateaux et sentiers." en="Volcanoes, highlands and trails." /></p>
          </Link>
          <Link href="/explore?category=beach" className="journey-tile journey-sand">
            <span className="tile-index">02</span>
            <div className="tile-symbol sun-symbol" aria-hidden="true" />
            <h3><T fr="Suivre l’océan" en="Follow the ocean" /></h3>
            <p><T fr="Plages, pêche et douceur atlantique." en="Beaches, fishing and Atlantic calm." /></p>
          </Link>
          <Link href="/explore?category=culture" className="journey-tile journey-red">
            <span className="tile-index">03</span>
            <div className="tile-symbol weave-symbol" aria-hidden="true"><i /><i /><i /><i /></div>
            <h3><T fr="Rencontrer les cultures" en="Meet the cultures" /></h3>
            <p><T fr="Patrimoine, arts et savoir-faire." en="Heritage, art and craft." /></p>
          </Link>
          <Link href="/explore?category=nature" className="journey-tile journey-ink">
            <span className="tile-index">04</span>
            <div className="tile-symbol leaf-symbol" aria-hidden="true" />
            <h3><T fr="Entrer dans le vivant" en="Step into the wild" /></h3>
            <p><T fr="Forêts, cascades et savanes." en="Forests, waterfalls and savanna." /></p>
          </Link>
        </div>
      </section>

      <section className="planner-banner">
        <div className="planner-photo">
          <img src={destinations[3].image} alt="Paysage de Rhumsiki dans l’Extrême-Nord" loading="lazy" />
        </div>
        <div className="planner-copy">
          <p className="eyebrow light"><T fr="Votre voyage, votre tempo" en="Your journey, your pace" /></p>
          <h2><T fr="Rassemblez vos coups de cœur." en="Bring your favourites together." /></h2>
          <p>
            <T
              fr="Ajoutez des lieux, réorganisez les étapes et gardez votre itinéraire sur cet appareil."
              en="Add places, reorder stops and keep your itinerary on this device."
            />
          </p>
          <Link className="button button-sun" href="/itinerary"><T fr="Créer mon itinéraire" en="Build my itinerary" /> <span>→</span></Link>
        </div>
      </section>

      <section className="promise-section section container">
        <div className="promise-intro">
          <p className="eyebrow"><T fr="Notre manière de voyager" en="How we travel" /></p>
          <h2><T fr="Curieux, respectueux, bien préparé." en="Curious, respectful, prepared." /></h2>
        </div>
        <div className="promise-list">
          <article><span>01</span><h3><T fr="Voir au-delà des clichés" en="Look beyond clichés" /></h3><p><T fr="Des récits courts, précis et ancrés dans les régions." en="Concise stories rooted in each region." /></p></article>
          <article><span>02</span><h3><T fr="Valoriser les acteurs locaux" en="Value local voices" /></h3><p><T fr="Des expériences pensées autour des guides et artisans." en="Experiences built around guides and makers." /></p></article>
          <article><span>03</span><h3><T fr="Préparer avant de partir" en="Prepare before leaving" /></h3><p><T fr="Saisons, durées et repères réunis au même endroit." en="Seasons, durations and essentials in one place." /></p></article>
        </div>
      </section>
    </PageShell>
  );
}
