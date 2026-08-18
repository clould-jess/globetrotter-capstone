import Link from "next/link";
import { destinations } from "@/lib/destinations";
import { T } from "./t";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-flag" aria-hidden="true"><i /><i /><i /></div>
      <div className="footer-grid">
        <div>
          <p className="eyebrow light">Cameroon Project</p>
          <h2><T fr="Un pays. Mille horizons." en="One country. A thousand horizons." /></h2>
          <p className="footer-note">
            <T
              fr="Projet scolaire de découverte responsable, pensé en français et en anglais."
              en="A bilingual school project for thoughtful discovery of Cameroon."
            />
          </p>
        </div>
        <div className="footer-links">
          <p><T fr="Découvrir" en="Discover" /></p>
          <Link href="/explore"><T fr="Toutes les destinations" en="All destinations" /></Link>
          <Link href="/guide"><T fr="Hôtels, tables & sorties" en="Hotels, food & activities" /></Link>
          <Link href="/recommendations"><T fr="Trouver mon inspiration" en="Find inspiration" /></Link>
          <Link href="/itinerary"><T fr="Créer un itinéraire" en="Build an itinerary" /></Link>
        </div>
        <div className="footer-links">
          <p><T fr="Projet" en="Project" /></p>
          <Link href="/architecture"><T fr="Phases & architecture" en="Phases & architecture" /></Link>
          <Link href="/credits"><T fr="Crédits photos" en="Photo credits" /></Link>
          <a href="mailto:hello@cameroon-project.test">hello@cameroon-project.test</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Cameroon Project</span>
        <span>
          <T fr={`${destinations.length} expériences éditoriales`} en={`${destinations.length} curated experiences`} />
        </span>
      </div>
    </footer>
  );
}
