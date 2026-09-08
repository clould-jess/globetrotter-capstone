import { AdminDashboard } from "@/components/admin-dashboard";
import { PageShell } from "@/components/page-shell";
import { T } from "@/components/t";

export default function AdminPage() {
  return (
    <PageShell>
      <section className="page-hero admin-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow light"><T fr="Pilotage du site" en="Website operations" /></p>
          <h1><T fr="Tableau de bord" en="Dashboard" /></h1>
          <p><T fr="Suivez la communauté et mettez à jour les destinations publiées." en="Monitor the community and update published destinations." /></p>
        </div>
      </section>
      <section className="container section-small">
        <AdminDashboard />
      </section>
    </PageShell>
  );
}
