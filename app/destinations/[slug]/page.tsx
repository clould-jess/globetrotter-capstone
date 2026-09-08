import { DestinationPageContent } from "@/components/destination-page-content";
import { destinations } from "@/lib/destinations";

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DestinationPageContent slug={slug} />;
}
