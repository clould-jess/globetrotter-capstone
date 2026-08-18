export type Localized = { fr: string; en: string };

export type Destination = {
  slug: string;
  name: string;
  region: Localized;
  zone: "coast" | "highlands" | "forest" | "sahel" | "city";
  categories: Array<"nature" | "culture" | "beach" | "adventure" | "city">;
  summary: Localized;
  description: Localized;
  duration: Localized;
  season: Localized;
  image: string;
  imagePage: string;
  credit: string;
  license: string;
  tone: string;
  highlights: Localized[];
};

export const destinations: Destination[] = [
  {
    slug: "mont-cameroun",
    name: "Mont Cameroun",
    region: { fr: "Sud-Ouest", en: "South-West" },
    zone: "highlands",
    categories: ["nature", "adventure"],
    summary: {
      fr: "Une ascension volcanique entre forêt dense, savane d’altitude et panoramas sur le golfe de Guinée.",
      en: "A volcanic ascent through rainforest, high savanna and sweeping Gulf of Guinea views.",
    },
    description: {
      fr: "Le toit de l’Afrique de l’Ouest domine Buea et offre l’une des randonnées les plus marquantes du pays. L’expérience se prépare avec un guide local, un rythme adapté et un équipement de montagne.",
      en: "West Africa’s highest peak rises above Buea and offers one of the country’s most memorable hikes. The experience is best prepared with a local guide, a suitable pace and mountain equipment.",
    },
    duration: { fr: "3 à 4 jours", en: "3–4 days" },
    season: { fr: "Novembre — février", en: "November — February" },
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Landscape_of_Mount_Cameroon.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Landscape_of_Mount_Cameroon.jpg",
    credit: "Buma Peter",
    license: "CC BY-SA 4.0",
    tone: "#17633d",
    highlights: [
      { fr: "Départ depuis Buea", en: "Start from Buea" },
      { fr: "Paysages volcaniques", en: "Volcanic landscapes" },
      { fr: "Guides de montagne locaux", en: "Local mountain guides" },
    ],
  },
  {
    slug: "kribi",
    name: "Kribi & la Lobé",
    region: { fr: "Sud", en: "South" },
    zone: "coast",
    categories: ["beach", "nature"],
    summary: {
      fr: "Des plages dorées, les chutes de la Lobé et une cuisine côtière généreuse au bord de l’Atlantique.",
      en: "Golden beaches, the Lobé Falls and generous coastal food on the Atlantic shore.",
    },
    description: {
      fr: "Kribi marie détente et exploration. On y vient pour les plages, les villages côtiers, les produits de la mer et les célèbres chutes de la Lobé qui rejoignent l’océan.",
      en: "Kribi blends relaxation and discovery. Come for beaches, coastal villages, seafood and the celebrated Lobé Falls flowing toward the ocean.",
    },
    duration: { fr: "2 à 3 jours", en: "2–3 days" },
    season: { fr: "Décembre — février", en: "December — February" },
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Lob%C3%A9_beach_kribi_Cameroon.jpg/1280px-Lob%C3%A9_beach_kribi_Cameroon.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Lob%C3%A9_beach_kribi_Cameroon.jpg",
    credit: "Blaizo 237",
    license: "CC BY-SA 4.0",
    tone: "#0d6f72",
    highlights: [
      { fr: "Chutes de la Lobé", en: "Lobé Falls" },
      { fr: "Plages atlantiques", en: "Atlantic beaches" },
      { fr: "Saveurs de la mer", en: "Coastal flavours" },
    ],
  },
  {
    slug: "ekom-nkam",
    name: "Ekom-Nkam",
    region: { fr: "Littoral", en: "Littoral" },
    zone: "forest",
    categories: ["nature", "adventure"],
    summary: {
      fr: "Une chute spectaculaire enveloppée par la forêt tropicale, à proximité de Melong et Nkongsamba.",
      en: "A spectacular waterfall wrapped in tropical forest near Melong and Nkongsamba.",
    },
    description: {
      fr: "Les chutes d’Ekom-Nkam révèlent toute la puissance des paysages du Moungo. Plusieurs points de vue permettent d’admirer la cascade et sa végétation luxuriante.",
      en: "Ekom-Nkam Falls reveal the full power of the Moungo landscape. Several viewpoints showcase the waterfall and its lush vegetation.",
    },
    duration: { fr: "1 journée", en: "1 day" },
    season: { fr: "Juin — novembre", en: "June — November" },
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Drone_view_of_the_amazing_Ekom_Nkam_waterfall.jpg/1280px-Drone_view_of_the_amazing_Ekom_Nkam_waterfall.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Drone_view_of_the_amazing_Ekom_Nkam_waterfall.jpg",
    credit: "Ndijose",
    license: "CC BY-SA 4.0",
    tone: "#0b5d45",
    highlights: [
      { fr: "Belvédères naturels", en: "Natural viewpoints" },
      { fr: "Forêt du Moungo", en: "Moungo rainforest" },
      { fr: "Excursion depuis Nkongsamba", en: "Trip from Nkongsamba" },
    ],
  },
  {
    slug: "rhumsiki",
    name: "Rhumsiki",
    region: { fr: "Extrême-Nord", en: "Far North" },
    zone: "sahel",
    categories: ["nature", "culture", "adventure"],
    summary: {
      fr: "Des pitons rocheux sculptent l’horizon des monts Mandara autour d’un village kapsiki emblématique.",
      en: "Rock spires shape the Mandara Mountains around an iconic Kapsiki village.",
    },
    description: {
      fr: "Rhumsiki offre un décor minéral unique et une rencontre avec les savoir-faire kapsiki. Le lever du jour révèle les reliefs, les maisons de pierre et les sentiers de montagne.",
      en: "Rhumsiki combines a singular mineral landscape with Kapsiki craftsmanship. Sunrise reveals the peaks, stone homes and mountain trails.",
    },
    duration: { fr: "2 à 3 jours", en: "2–3 days" },
    season: { fr: "Novembre — février", en: "November — February" },
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Rhumsiki_with_Kapsiki_Peak_%28after_sunrise%29%2C_Far_North_Province_of_Cameroon.jpg/1280px-Rhumsiki_with_Kapsiki_Peak_%28after_sunrise%29%2C_Far_North_Province_of_Cameroon.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Rhumsiki_with_Kapsiki_Peak_(after_sunrise),_Far_North_Province_of_Cameroon.jpg",
    credit: "Alfred Weidinger",
    license: "CC BY 2.0",
    tone: "#a14e2d",
    highlights: [
      { fr: "Pics des Mandara", en: "Mandara peaks" },
      { fr: "Culture kapsiki", en: "Kapsiki culture" },
      { fr: "Lumières du Sahel", en: "Sahel light" },
    ],
  },
  {
    slug: "foumban",
    name: "Foumban",
    region: { fr: "Ouest", en: "West" },
    zone: "highlands",
    categories: ["culture", "city"],
    summary: {
      fr: "Une capitale artistique et historique où palais, musées et ateliers racontent le royaume bamoun.",
      en: "An artistic and historic capital where palaces, museums and workshops tell the Bamoun story.",
    },
    description: {
      fr: "Foumban se découvre à travers son patrimoine royal, ses artisans, ses marchés et ses collections. C’est une étape essentielle pour comprendre la profondeur culturelle des Grassfields.",
      en: "Foumban unfolds through royal heritage, artisans, markets and collections—an essential stop for understanding the cultural depth of the Grassfields.",
    },
    duration: { fr: "1 à 2 jours", en: "1–2 days" },
    season: { fr: "Toute l’année", en: "Year-round" },
    image: "https://upload.wikimedia.org/wikipedia/commons/2/23/La_porte_principale_du_sultanat_de_Foumban.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:La_porte_principale_du_sultanat_de_Foumban.jpg",
    credit: "Ruetoyota",
    license: "CC BY-SA 3.0",
    tone: "#8d2f26",
    highlights: [
      { fr: "Patrimoine bamoun", en: "Bamoun heritage" },
      { fr: "Route des artisans", en: "Artisans’ quarter" },
      { fr: "Musées et palais", en: "Museums and palace" },
    ],
  },
  {
    slug: "yaounde",
    name: "Yaoundé",
    region: { fr: "Centre", en: "Centre" },
    zone: "city",
    categories: ["city", "culture"],
    summary: {
      fr: "La capitale aux sept collines, entre musées, marchés, jardins et scènes culinaires contemporaines.",
      en: "The seven-hill capital, shaped by museums, markets, gardens and a contemporary food scene.",
    },
    description: {
      fr: "Yaoundé est un excellent point de départ pour comprendre le Cameroun urbain. Ses quartiers, ses institutions culturelles et ses tables permettent une première immersion accessible.",
      en: "Yaoundé is an excellent gateway to urban Cameroon. Its neighbourhoods, cultural institutions and restaurants offer an approachable first immersion.",
    },
    duration: { fr: "2 jours", en: "2 days" },
    season: { fr: "Toute l’année", en: "Year-round" },
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Views_of_Yaounde_Cameroon_05.jpg/1280px-Views_of_Yaounde_Cameroon_05.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Views_of_Yaounde_Cameroon_05.jpg",
    credit: "Kateregga1",
    license: "CC BY-SA 4.0",
    tone: "#244d45",
    highlights: [
      { fr: "Musées et galeries", en: "Museums and galleries" },
      { fr: "Marchés de la capitale", en: "Capital markets" },
      { fr: "Cuisine camerounaise", en: "Cameroonian food" },
    ],
  },
];

export const getDestination = (slug: string) =>
  destinations.find((destination) => destination.slug === slug);

export const categoryLabels = {
  all: { fr: "Tout voir", en: "All" },
  nature: { fr: "Nature", en: "Nature" },
  culture: { fr: "Culture", en: "Culture" },
  beach: { fr: "Plages", en: "Beaches" },
  adventure: { fr: "Aventure", en: "Adventure" },
  city: { fr: "Villes", en: "Cities" },
};
