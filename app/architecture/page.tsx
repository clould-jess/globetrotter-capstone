import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";

const phase1 = [
  { title: { fr: "Interface web", en: "Web interface" }, text: { fr: "Accueil, exploration, fiches, recommandations et itinéraire bilingue.", en: "Bilingual home, explore, detail, recommendation and itinerary experiences." } },
  { title: { fr: "API monolithique", en: "Monolithic API" }, text: { fr: "Un seul service expose les destinations, profils et itinéraires.", en: "One service exposes destinations, profiles and itineraries." } },
  { title: { fr: "Données simples", en: "Simple data" }, text: { fr: "Jeu de données JSON pour prototyper vite et tester les parcours.", en: "A JSON dataset for fast prototyping and journey testing." } },
  { title: { fr: "Socle qualité", en: "Quality baseline" }, text: { fr: "Validation, sécurité de base, tests automatisés et documentation.", en: "Validation, baseline security, automated checks and documentation." } },
];

const security = [
  "Validation stricte des entrées / Strict input validation",
  "TLS, en-têtes de sécurité et CORS limité / TLS, security headers and restricted CORS",
  "JWT courts + rôles utilisateur et administrateur / Short-lived JWTs + user/admin roles",
  "Limitation de débit et journaux sans données sensibles / Rate limits and privacy-safe logs",
  "Secrets hors du code et dépendances verrouillées / Secrets outside code and locked dependencies",
  "Sauvegardes, contrôles de santé et piste d’audit / Backups, health checks and audit trail",
];

export default function ArchitecturePage() {
  return (
    <PageShell>
      <section className="architecture-hero page-hero">
        <div className="container architecture-title">
          <p className="eyebrow light"><T fr="Dossier technique" en="Technical brief" /></p>
          <h1><T fr="Du prototype aux microservices" en="From prototype to microservices" /></h1>
          <p><T fr="L’architecture du projet expliquée simplement, phase par phase." en="The project architecture, explained simply phase by phase." /></p>
        </div>
      </section>

      <section className="phase-section container section-small">
        <div className="phase-label"><span>PHASE</span><strong>01</strong></div>
        <div className="phase-content">
          <p className="eyebrow"><T fr="Construire et valider" en="Build and validate" /></p>
          <h2><T fr="Un monolithe clair pour prouver l’idée" en="A clear monolith to prove the idea" /></h2>
          <p className="phase-lead"><T fr="Au départ, toutes les fonctions vivent ensemble. L’équipe avance vite, observe les utilisateurs et stabilise le produit avant de le découper." en="At first, every function lives together. The team moves quickly, observes users and stabilises the product before splitting it." /></p>
          <div className="phase-card-grid">
            {phase1.map((item, index) => <article key={item.title.fr}><span>0{index + 1}</span><h3><T fr={item.title.fr} en={item.title.en} /></h3><p><T fr={item.text.fr} en={item.text.en} /></p></article>)}
          </div>
        </div>
      </section>

      <section className="phase-two-section">
        <div className="container phase-two-head">
          <div className="phase-label light-phase"><span>PHASE</span><strong>02</strong></div>
          <div><p className="eyebrow light"><T fr="Séparer pour évoluer" en="Separate to scale" /></p><h2><T fr="Des services autonomes, une expérience unique" en="Independent services, one experience" /></h2><p><T fr="La passerelle reçoit toutes les demandes puis les transmet au bon service. Chaque service possède ses données et peut évoluer sans bloquer les autres." en="The gateway receives each request and routes it to the right service. Every service owns its data and can evolve independently." /></p></div>
        </div>
        <div className="container architecture-flow" aria-label="Architecture de phase 2">
          <div className="flow-node client-node"><small>WEB / MOBILE</small><strong><T fr="Visiteur" en="Visitor" /></strong></div>
          <span className="flow-arrow">→</span>
          <div className="flow-node gateway-node"><small>API GATEWAY</small><strong><T fr="Entrée sécurisée" en="Secure entry" /></strong></div>
          <span className="flow-arrow">→</span>
          <div className="service-stack">
            <div className="flow-node"><small>USER SERVICE</small><strong><T fr="Comptes" en="Accounts" /></strong><i>PostgreSQL</i></div>
            <div className="flow-node"><small>ITINERARY SERVICE</small><strong><T fr="Voyages" en="Trips" /></strong><i>PostgreSQL</i></div>
            <div className="flow-node"><small>DISCOVERY SERVICE</small><strong><T fr="Découverte" en="Discovery" /></strong><i>PostgreSQL</i></div>
          </div>
          <div className="event-bus"><small>RABBITMQ</small><strong><T fr="Événements asynchrones" en="Asynchronous events" /></strong></div>
        </div>
        <div className="container technology-row">
          {[
            ["React + TypeScript", "Interface"], ["FastAPI", "Services REST"], ["PostgreSQL", "Données"], ["RabbitMQ", "Événements"], ["Docker Compose", "Exécution"], ["OpenAPI", "Contrats"],
          ].map(([name, role]) => <div key={name}><strong>{name}</strong><span>{role}</span></div>)}
        </div>
      </section>

      <section className="security-section container section-small">
        <div className="security-copy"><p className="eyebrow"><T fr="Sécurité dès la conception" en="Security by design" /></p><h2><T fr="Protéger sans compliquer" en="Protect without adding friction" /></h2><p><T fr="Les contrôles suivent les recommandations OWASP et couvrent les données, les accès, les communications et l’exploitation." en="Controls follow OWASP guidance and cover data, access, communications and operations." /></p></div>
        <ol className="security-list">{security.map((item, index) => <li key={item}><span>0{index + 1}</span><p>{item}</p></li>)}</ol>
      </section>

      <section className="deliverables-section">
        <div className="container"><p className="eyebrow light"><T fr="Livrables inclus" en="Included deliverables" /></p><h2><T fr="Un dossier prêt à présenter et à développer" en="A project ready to present and extend" /></h2><div className="deliverable-grid">
          <article><strong>01</strong><h3><T fr="Site responsive" en="Responsive website" /></h3><p><T fr="Ordinateur, tablette et mobile." en="Desktop, tablet and mobile." /></p></article>
          <article><strong>02</strong><h3><T fr="Contrats API" en="API contracts" /></h3><p>REST / OpenAPI</p></article>
          <article><strong>03</strong><h3><T fr="Environnement local" en="Local environment" /></h3><p>Docker Compose</p></article>
          <article><strong>04</strong><h3><T fr="Documentation" en="Documentation" /></h3><p><T fr="Architecture, sécurité et démarrage." en="Architecture, security and setup." /></p></article>
        </div></div>
      </section>
    </PageShell>
  );
}
