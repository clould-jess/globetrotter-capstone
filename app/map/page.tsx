import type { Metadata } from "next";
import { RoadMap } from "@/components/road-map";

export const metadata: Metadata = { title: "Carte et itinéraires" };
export default function MapPage() { return <main><RoadMap immersive /></main>; }
