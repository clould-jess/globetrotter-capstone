import Link from "next/link";
import { LanguageToggle } from "./language-toggle";
import { T } from "./t";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Cameroon Project — Accueil">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>CAMEROON</b>
            <small>PROJECT</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navigation principale">
          <Link href="/explore"><T fr="Explorer" en="Explore" /></Link>
          <Link href="/guide"><T fr="Séjour & sorties" en="Stay & enjoy" /></Link>
          <Link href="/recommendations"><T fr="Inspirations" en="Inspiration" /></Link>
          <Link href="/itinerary"><T fr="Mon itinéraire" en="My itinerary" /></Link>
          <Link href="/architecture"><T fr="Le projet" en="The project" /></Link>
        </nav>
        <div className="header-actions">
          <LanguageToggle />
          <Link className="header-cta" href="/itinerary">
            <T fr="Créer un voyage" en="Plan a trip" />
          </Link>
        </div>
      </div>
    </header>
  );
}
