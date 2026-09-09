import Link from "next/link";
import { LanguageToggle } from "./language-toggle";
import { GlobalSearch } from "./global-search";
import { T } from "./t";
import { AccountMenu } from "./account-menu";

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
          <Link href="/map"><T fr="Carte & trajets" en="Map & routes" /></Link>
          <Link href="/community"><T fr="Discussions" en="Community" /></Link>
        </nav>
        <GlobalSearch />
        <div className="header-actions">
          <LanguageToggle />
          <AccountMenu />
          <Link className="header-cta" href="/itinerary">
            <T fr="Créer un voyage" en="Plan a trip" />
          </Link>
        </div>
      </div>
    </header>
  );
}
