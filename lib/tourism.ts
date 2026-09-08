import { destinations, type Localized } from "./destinations";

export type TouristPlaceType =
  | "hotel"
  | "motel"
  | "apartment"
  | "restaurant"
  | "fastfood"
  | "car-rental"
  | "activity";

export type TouristPlace = {
  id: string;
  name: string;
  type: TouristPlaceType;
  city: string;
  region?: Localized;
  area: Localized;
  coordinates: { lat: number; lng: number };
  summary: Localized;
  details: Localized;
  tags: Localized[];
  destinationSlugs: string[];
  sourceUrl: string;
  mapsQuery?: string;
  image?: string;
  imageAlt?: Localized;
  imagePage?: string;
  imageCredit?: string;
  imageLicense?: string;
  imageKind?: "place" | "context";
};

const featuredTourismPlaces: TouristPlace[] = [
  {
    id: "hilton-yaounde",
    name: "Hilton Yaoundé",
    type: "hotel",
    city: "Yaoundé",
    area: { fr: "Boulevard du 20 Mai", en: "Boulevard du 20 Mai" },
    coordinates: { lat: 3.86458, lng: 11.51567 },
    summary: {
      fr: "Un point de chute central, proche des musées et du quartier administratif.",
      en: "A central base close to museums and the administrative district.",
    },
    details: {
      fr: "Piscine extérieure · centre de fitness · transfert aéroport sur demande",
      en: "Outdoor pool · fitness centre · airport transfer on request",
    },
    tags: [
      { fr: "Centre-ville", en: "City centre" },
      { fr: "Piscine", en: "Pool" },
      { fr: "Transfert", en: "Transfer" },
    ],
    destinationSlugs: ["yaounde"],
    sourceUrl: "https://www.hilton.com/en/hotels/yaohitw-hilton-yaounde/",
    image: "/places/hilton-yaounde.webp",
    imageAlt: { fr: "Façade du Hilton Yaoundé", en: "Hilton Yaoundé exterior" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Hilton_Hotel_Yaound%C3%A9.JPG",
    imageCredit: "Fawaz.tairou",
    imageLicense: "CC BY-SA 3.0",
    imageKind: "place",
  },
  {
    id: "le-safoutier",
    name: "Le Safoutier",
    type: "restaurant",
    city: "Yaoundé",
    area: { fr: "Hilton Yaoundé", en: "Hilton Yaoundé" },
    coordinates: { lat: 3.86455, lng: 11.51572 },
    summary: {
      fr: "Buffets camerounais et internationaux dans un cadre contemporain.",
      en: "Cameroonian and international buffets in a contemporary setting.",
    },
    details: {
      fr: "Petit-déjeuner · déjeuner · brunch · cuisine locale",
      en: "Breakfast · lunch · brunch · local cuisine",
    },
    tags: [
      { fr: "Cuisine locale", en: "Local cuisine" },
      { fr: "Brunch", en: "Brunch" },
      { fr: "En famille", en: "Family-friendly" },
    ],
    destinationSlugs: ["yaounde"],
    sourceUrl: "https://www.hilton.com/en/hotels/yaohitw-hilton-yaounde/dining/",
    image: "/places/le-safoutier.webp",
    imageAlt: { fr: "Ndolé et banane bouillie, cuisine camerounaise", en: "Ndolé with boiled plantain, Cameroonian cuisine" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Ndol%C3%A8_et_banane_bouillie.jpg",
    imageCredit: "Fawaz.tairou",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "musee-national-yaounde",
    name: "Musée national du Cameroun",
    type: "activity",
    city: "Yaoundé",
    area: { fr: "Quartier du Lac", en: "Lac district" },
    coordinates: { lat: 3.85725, lng: 11.51472 },
    summary: {
      fr: "Une première lecture du pays à travers histoire, arts et patrimoine.",
      en: "An introduction to the country through history, art and heritage.",
    },
    details: {
      fr: "Visite culturelle · centre-ville · horaires à confirmer",
      en: "Cultural visit · city centre · confirm opening hours",
    },
    tags: [
      { fr: "Culture", en: "Culture" },
      { fr: "Histoire", en: "History" },
      { fr: "À l’abri", en: "Indoor" },
    ],
    destinationSlugs: ["yaounde"],
    sourceUrl: "https://www.cameroonembassyusa.org/tourism.php",
    image: "/places/musee-national.webp",
    imageAlt: { fr: "Façade du Musée national du Cameroun à Yaoundé", en: "National Museum of Cameroon exterior in Yaoundé" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Mus%C3%A9e_National_du_Cameroun_01.JPG",
    imageCredit: "Z. NGNOGUE",
    imageLicense: "CC BY-SA 3.0",
    imageKind: "place",
  },
  {
    id: "onomo-douala",
    name: "ONOMO Hotel Douala",
    type: "hotel",
    city: "Douala",
    area: { fr: "Bonanjo", en: "Bonanjo" },
    coordinates: { lat: 4.03518, lng: 9.68743 },
    summary: {
      fr: "Un hôtel contemporain qui met en avant design, artisanat et culture du Cameroun.",
      en: "A contemporary hotel celebrating Cameroonian design, craft and culture.",
    },
    details: {
      fr: "Wi-Fi · piscine · navette aéroport · conciergerie",
      en: "Wi-Fi · pool · airport shuttle · concierge",
    },
    tags: [
      { fr: "Aéroport", en: "Airport" },
      { fr: "Piscine", en: "Pool" },
      { fr: "Conciergerie", en: "Concierge" },
    ],
    destinationSlugs: ["mont-cameroun", "ekom-nkam"],
    sourceUrl: "https://www.onomohotels.com/en/hotel/onomo-hotel-douala/",
    image: "/places/onomo-douala.webp",
    imageAlt: { fr: "Façade de l’ONOMO Hotel Douala à Bonanjo", en: "ONOMO Hotel Douala exterior in Bonanjo" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Onomo_Hotel_Douala_Bonanjo.jpg",
    imageCredit: "Serieminou",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "place",
  },
  {
    id: "o-restaurant",
    name: "O’Restaurant",
    type: "restaurant",
    city: "Douala",
    area: { fr: "ONOMO, Bonanjo", en: "ONOMO, Bonanjo" },
    coordinates: { lat: 4.0352, lng: 9.68748 },
    summary: {
      fr: "Un buffet généreux construit autour de produits locaux et de saveurs tropicales.",
      en: "A generous buffet centred on local produce and tropical flavours.",
    },
    details: {
      fr: "Buffet · produits locaux · service continu annoncé",
      en: "Buffet · local produce · continuous service advertised",
    },
    tags: [
      { fr: "Produits locaux", en: "Local produce" },
      { fr: "Buffet", en: "Buffet" },
      { fr: "En famille", en: "Family-friendly" },
    ],
    destinationSlugs: ["mont-cameroun", "ekom-nkam"],
    sourceUrl: "https://www.onomohotels.com/en/hotel/onomo-hotel-douala/",
    image: "/places/o-restaurant.webp",
    imageAlt: { fr: "Sanga, plat camerounais à base de maïs et de feuilles", en: "Sanga, a Cameroonian corn and leafy-green dish" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Le_Sanga..%21%21.jpg",
    imageCredit: "Ishtar19",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "k-hotel-douala",
    name: "K Hotel Douala",
    type: "hotel",
    city: "Douala",
    area: { fr: "729 rue Christian Tobie Kuoh, Bonanjo", en: "729 Christian Tobie Kuoh Street, Bonanjo" },
    coordinates: { lat: 4.0418, lng: 9.6879 },
    summary: {
      fr: "Une adresse urbaine proche du musée maritime et des repères de Bonanjo.",
      en: "An urban stay close to the Maritime Museum and Bonanjo landmarks.",
    },
    details: {
      fr: "Piscine · Wi-Fi · restaurant · terrasse",
      en: "Pool · Wi-Fi · restaurant · terrace",
    },
    tags: [
      { fr: "Bonanjo", en: "Bonanjo" },
      { fr: "Piscine", en: "Pool" },
      { fr: "Musées proches", en: "Near museums" },
    ],
    destinationSlugs: ["mont-cameroun", "ekom-nkam"],
    sourceUrl: "https://www.khoteldouala.com/",
    image: "/places/k-hotel.webp",
    imageAlt: { fr: "Scène urbaine à Bonanjo, quartier du K Hotel", en: "Bonanjo streetscape, the K Hotel district" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Moving_in_bonanjo.jpg",
    imageCredit: "Minette Lontsie",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "kotcha-restaurant",
    name: "Kotcha Restaurant",
    type: "restaurant",
    city: "Douala",
    area: { fr: "K Hotel, Bonanjo", en: "K Hotel, Bonanjo" },
    coordinates: { lat: 4.04182, lng: 9.68793 },
    summary: {
      fr: "Une table contemporaine avec une cuisine de saison servie toute la journée.",
      en: "Contemporary all-day dining shaped by seasonal ingredients.",
    },
    details: {
      fr: "Petit-déjeuner · déjeuner · dîner · cadre contemporain",
      en: "Breakfast · lunch · dinner · contemporary setting",
    },
    tags: [
      { fr: "Toute la journée", en: "All-day dining" },
      { fr: "Produits de saison", en: "Seasonal produce" },
      { fr: "En famille", en: "Family-friendly" },
    ],
    destinationSlugs: ["mont-cameroun", "ekom-nkam"],
    sourceUrl: "https://www.khoteldouala.com/eat-and-drink/kotcha-restaurant/",
    image: "/places/kotcha.webp",
    imageAlt: { fr: "Poulet DG, spécialité camerounaise", en: "Poulet DG, a Cameroonian speciality" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Poulet_D.G_du_Chef_Alex_Bella_Ola.jpeg",
    imageCredit: "MarieroseNN",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "musee-maritime-douala",
    name: "Musée maritime de Douala",
    type: "activity",
    city: "Douala",
    area: { fr: "Bonanjo", en: "Bonanjo" },
    coordinates: { lat: 4.03802, lng: 9.68325 },
    summary: {
      fr: "Le fleuve Wouri, le port et l’histoire maritime racontés dans un musée emblématique.",
      en: "The Wouri River, port and maritime history told through a landmark museum.",
    },
    details: {
      fr: "Mardi à dimanche annoncé · visite individuelle ou en groupe",
      en: "Advertised Tuesday to Sunday · individual or group visits",
    },
    tags: [
      { fr: "Musée", en: "Museum" },
      { fr: "Histoire", en: "History" },
      { fr: "En famille", en: "Family-friendly" },
    ],
    destinationSlugs: ["mont-cameroun", "ekom-nkam"],
    sourceUrl: "https://museemaritime.cm/en/",
    image: "/places/musee-maritime.webp",
    imageAlt: { fr: "Façade du Musée maritime de Douala", en: "Douala Maritime Museum exterior" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Mus%C3%A9e_Maritime_de_Douala.jpg",
    imageCredit: "Serieminou",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "place",
  },
  {
    id: "hotel-ilomba",
    name: "Hôtel Ilomba",
    type: "hotel",
    city: "Kribi",
    area: { fr: "Bwambe, près des chutes de la Lobé", en: "Bwambe, near the Lobé Falls" },
    coordinates: { lat: 2.8825, lng: 9.8918 },
    summary: {
      fr: "Un séjour en bord d’océan, entre jardin tropical et excursions dans le Sud.",
      en: "An oceanfront stay between tropical gardens and southern excursions.",
    },
    details: {
      fr: "Plage · restaurant · expériences · bien-être",
      en: "Beach · restaurant · experiences · wellness",
    },
    tags: [
      { fr: "Bord de mer", en: "Seafront" },
      { fr: "Jardin", en: "Garden" },
      { fr: "Excursions", en: "Excursions" },
    ],
    destinationSlugs: ["kribi"],
    sourceUrl: "https://hotelilomba.com/en/",
    image: "/places/hotel-ilomba.webp",
    imageAlt: { fr: "Coucher de soleil sur la plage de Kribi", en: "Sunset over Kribi beach" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Dusk_on_the_beach_of_Kribi-Cameroon_with_the_visible_new_moon_on_a_clear_sky_in_spring.jpg",
    imageCredit: "WaiKum",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "le-baobab-ilomba",
    name: "Le Baobab",
    type: "restaurant",
    city: "Kribi",
    area: { fr: "Hôtel Ilomba, Bwambe", en: "Hotel Ilomba, Bwambe" },
    coordinates: { lat: 2.88252, lng: 9.89184 },
    summary: {
      fr: "Cuisine africaine, inspirations occidentales et produits de saison près de l’océan.",
      en: "African cuisine, Western influences and seasonal produce by the ocean.",
    },
    details: {
      fr: "Petit-déjeuner · déjeuner · dîner · service quotidien annoncé",
      en: "Breakfast · lunch · dinner · advertised daily service",
    },
    tags: [
      { fr: "Cuisine africaine", en: "African cuisine" },
      { fr: "Produits de saison", en: "Seasonal produce" },
      { fr: "Océan", en: "Ocean" },
    ],
    destinationSlugs: ["kribi"],
    sourceUrl: "https://hotelilomba.com/en/restaurant-bar/",
    image: "/places/le-baobab.webp",
    imageAlt: { fr: "Ndolé et plantains mûrs, cuisine camerounaise", en: "Ndolé and ripe plantains, Cameroonian cuisine" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Ndole_and_Ripe_Plantains.jpg",
    imageCredit: "Giftcup",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "chutes-lobe",
    name: "Chutes de la Lobé",
    type: "activity",
    city: "Kribi",
    area: { fr: "Route côtière au sud de Kribi", en: "Coastal road south of Kribi" },
    coordinates: { lat: 2.887, lng: 9.893 },
    summary: {
      fr: "Une rencontre spectaculaire entre cascades, végétation et Atlantique.",
      en: "A spectacular meeting point between waterfalls, vegetation and the Atlantic.",
    },
    details: {
      fr: "Guide local recommandé · accès et météo à vérifier",
      en: "Local guide recommended · check access and weather",
    },
    tags: [
      { fr: "Nature", en: "Nature" },
      { fr: "Photographie", en: "Photography" },
      { fr: "Guide local", en: "Local guide" },
    ],
    destinationSlugs: ["kribi"],
    sourceUrl: "https://whc.unesco.org/en/activities/414/",
    image: "/places/chutes-lobe.webp",
    imageAlt: { fr: "Les chutes de la Lobé rejoignant l’Atlantique à Kribi", en: "Lobé Falls meeting the Atlantic near Kribi" },
    imagePage: "https://commons.wikimedia.org/wiki/File:LOB%C3%89_Falls_Kribi.jpg",
    imageCredit: "Emerymakini",
    imageLicense: "CC BY 4.0",
    imageKind: "place",
  },
  {
    id: "mountain-hotel-buea",
    name: "Mountain Hotel Buea",
    type: "hotel",
    city: "Buea",
    area: { fr: "Au pied du Mont Cameroun", en: "At the foot of Mount Cameroon" },
    coordinates: { lat: 4.1593, lng: 9.24354 },
    summary: {
      fr: "Une base historique à Buea pour découvrir la ville et préparer la montagne.",
      en: "A long-standing Buea base for exploring town and preparing for the mountain.",
    },
    details: {
      fr: "Parking · Wi-Fi · restauration · vue montagne",
      en: "Parking · Wi-Fi · dining · mountain views",
    },
    tags: [
      { fr: "Montagne", en: "Mountain" },
      { fr: "Parking", en: "Parking" },
      { fr: "Buea", en: "Buea" },
    ],
    destinationSlugs: ["mont-cameroun"],
    sourceUrl: "https://mountainhotelcameroon.com/",
    image: "/places/mountain-hotel.webp",
    imageAlt: { fr: "Palais du gouverneur à Buea, repère historique de la ville", en: "Governor’s Palace in Buea, a historic city landmark" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Governor%27s_Palace_Buea_2014.jpg",
    imageCredit: "Bdx",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "context",
  },
  {
    id: "mont-cameroun-ascension",
    name: "Mont Cameroun",
    type: "activity",
    city: "Buea",
    area: { fr: "Départ depuis Buea", en: "Start from Buea" },
    coordinates: { lat: 4.203, lng: 9.1705 },
    summary: {
      fr: "Une expérience volcanique majeure à organiser avec un guide de montagne reconnu.",
      en: "A major volcanic experience to organise with a recognised mountain guide.",
    },
    details: {
      fr: "Guide indispensable · préparation physique · météo à vérifier",
      en: "Guide essential · physical preparation · check weather",
    },
    tags: [
      { fr: "Randonnée", en: "Hiking" },
      { fr: "Volcan", en: "Volcano" },
      { fr: "Guide", en: "Guide" },
    ],
    destinationSlugs: ["mont-cameroun"],
    sourceUrl: "https://discover-cameroon.com/en/tours/",
    image: "/places/mont-cameroun.webp",
    imageAlt: { fr: "Randonneurs sur les pentes du Mont Cameroun", en: "Hikers on the slopes of Mount Cameroon" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Athele_au_Mont_Cameroun.jpg",
    imageCredit: "Edtamba",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "place",
  },
  {
    id: "ekom-nkam-waterfalls",
    name: "Chutes d’Ekom-Nkam",
    type: "activity",
    city: "Melong",
    area: { fr: "Moungo, près de Nkongsamba", en: "Moungo, near Nkongsamba" },
    coordinates: { lat: 5.0697, lng: 9.9488 },
    summary: {
      fr: "Une grande cascade au cœur d’un paysage tropical spectaculaire.",
      en: "A major waterfall set in a spectacular tropical landscape.",
    },
    details: {
      fr: "Excursion à la journée · chaussures adaptées · guide recommandé",
      en: "Day trip · suitable footwear · guide recommended",
    },
    tags: [
      { fr: "Cascade", en: "Waterfall" },
      { fr: "Forêt", en: "Forest" },
      { fr: "Excursion", en: "Day trip" },
    ],
    destinationSlugs: ["ekom-nkam"],
    sourceUrl: "https://discover-cameroon.com/en/tours/",
    image: "/places/ekom-nkam.webp",
    imageAlt: { fr: "Les chutes d’Ekom-Nkam dans la forêt du Moungo", en: "Ekom-Nkam Falls in the Moungo forest" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Chutes_d%27Ekom_Nkam.jpg",
    imageCredit: "Razdagger",
    imageLicense: "CC BY-SA 3.0",
    imageKind: "place",
  },
  {
    id: "palais-royal-foumban",
    name: "Palais royal de Foumban",
    type: "activity",
    city: "Foumban",
    area: { fr: "Centre historique", en: "Historic centre" },
    coordinates: { lat: 5.7292, lng: 10.9008 },
    summary: {
      fr: "Le grand repère du patrimoine bamoun, entouré de musées et d’ateliers d’artisans.",
      en: "A landmark of Bamoun heritage surrounded by museums and artisan workshops.",
    },
    details: {
      fr: "Patrimoine · artisanat · visite culturelle",
      en: "Heritage · craft · cultural visit",
    },
    tags: [
      { fr: "Patrimoine", en: "Heritage" },
      { fr: "Artisanat", en: "Craft" },
      { fr: "Musées", en: "Museums" },
    ],
    destinationSlugs: ["foumban"],
    sourceUrl: "https://www.cameroonembassyusa.org/tourism.php",
    image: "/places/palais-foumban.webp",
    imageAlt: { fr: "Entrée du musée du Palais royal de Foumban", en: "Museum entrance at Foumban Royal Palace" },
    imagePage: "https://commons.wikimedia.org/wiki/File:CAM-Foumban-Palais_royal-Entr%C3%A9e_du_mus%C3%A9e.jpg",
    imageCredit: "WILLAV-FR",
    imageLicense: "CC BY-SA 4.0",
    imageKind: "place",
  },
  {
    id: "rhumsiki-paysage",
    name: "Circuit culturel de Rhumsiki",
    type: "activity",
    city: "Rhumsiki",
    area: { fr: "Monts Mandara", en: "Mandara Mountains" },
    coordinates: { lat: 10.488, lng: 13.589 },
    summary: {
      fr: "Paysages rocheux, savoir-faire kapsiki et lumière du Sahel avec accompagnement local.",
      en: "Rock landscapes, Kapsiki craft and Sahel light with local accompaniment.",
    },
    details: {
      fr: "Guide local · conditions régionales et accès à confirmer",
      en: "Local guide · confirm regional conditions and access",
    },
    tags: [
      { fr: "Paysage", en: "Landscape" },
      { fr: "Culture", en: "Culture" },
      { fr: "Guide local", en: "Local guide" },
    ],
    destinationSlugs: ["rhumsiki"],
    sourceUrl: "https://www.cameroonembassyusa.org/tourism.php",
    image: "/places/rhumsiki.webp",
    imageAlt: { fr: "Habitat kapsiki dans le paysage rocheux de Rhumsiki", en: "Kapsiki home in Rhumsiki’s rocky landscape" },
    imagePage: "https://commons.wikimedia.org/wiki/File:Kapsiki_home_in_Rhumsiki.jpg",
    imageCredit: "Amcaja",
    imageLicense: "CC BY-SA 3.0",
    imageKind: "place",
  },
];

type RegionalHub = {
  region: Localized;
  city: string;
  coordinates: { lat: number; lng: number };
  destinationSlugs: string[];
};

const regionalHubs: RegionalHub[] = [
  { region: { fr: "Extrême-Nord", en: "Far North" }, city: "Maroua", coordinates: { lat: 10.591, lng: 14.315 }, destinationSlugs: ["rhumsiki", "waza"] },
  { region: { fr: "Nord", en: "North" }, city: "Garoua", coordinates: { lat: 9.301, lng: 13.397 }, destinationSlugs: ["benoue"] },
  { region: { fr: "Adamaoua", en: "Adamawa" }, city: "Ngaoundéré", coordinates: { lat: 7.327, lng: 13.584 }, destinationSlugs: ["tello"] },
  { region: { fr: "Nord-Ouest", en: "North-West" }, city: "Bamenda", coordinates: { lat: 5.959, lng: 10.146 }, destinationSlugs: ["lake-awing"] },
  { region: { fr: "Ouest", en: "West" }, city: "Bafoussam", coordinates: { lat: 5.478, lng: 10.418 }, destinationSlugs: ["foumban"] },
  { region: { fr: "Sud-Ouest", en: "South-West" }, city: "Buea", coordinates: { lat: 4.155, lng: 9.231 }, destinationSlugs: ["mont-cameroun", "limbe"] },
  { region: { fr: "Littoral", en: "Littoral" }, city: "Douala", coordinates: { lat: 4.052, lng: 9.768 }, destinationSlugs: ["ekom-nkam"] },
  { region: { fr: "Centre", en: "Centre" }, city: "Yaoundé", coordinates: { lat: 3.848, lng: 11.502 }, destinationSlugs: ["yaounde"] },
  { region: { fr: "Est", en: "East" }, city: "Bertoua", coordinates: { lat: 4.577, lng: 13.684 }, destinationSlugs: ["dja", "lobeke"] },
  { region: { fr: "Sud", en: "South" }, city: "Kribi", coordinates: { lat: 2.94, lng: 9.91 }, destinationSlugs: ["kribi"] },
];

const serviceBlueprints: Array<{
  key: string;
  type: Exclude<TouristPlaceType, "activity">;
  title: Localized;
  summary: Localized;
  details: Localized;
  query: Localized;
  tags: Localized[];
}> = [
  {
    key: "hotels-lodges", type: "hotel",
    title: { fr: "Hôtels & lodges", en: "Hotels & lodges" },
    summary: { fr: "Comparez les hôtels, resorts et lodges disponibles autour de la ville et de ses principaux sites.", en: "Compare hotels, resorts and lodges around the city and its main sights." },
    details: { fr: "Tarifs, disponibilités et services à confirmer avant réservation", en: "Confirm rates, availability and services before booking" },
    query: { fr: "hôtels et lodges", en: "hotels and lodges" },
    tags: [{ fr: "Séjour", en: "Stay" }, { fr: "Comparaison", en: "Compare" }, { fr: "Réservation", en: "Booking" }],
  },
  {
    key: "motels-guesthouses", type: "motel",
    title: { fr: "Motels & maisons d’hôtes", en: "Motels & guesthouses" },
    summary: { fr: "Repérez des solutions plus simples, des auberges et des maisons d’hôtes proches de votre parcours.", en: "Find simpler stays, inns and guesthouses close to your route." },
    details: { fr: "Vérifiez avis récents, accès, sécurité et conditions d’arrivée", en: "Check recent reviews, access, security and arrival conditions" },
    query: { fr: "motels maisons d'hôtes auberges", en: "motels guesthouses inns" },
    tags: [{ fr: "Petit budget", en: "Budget" }, { fr: "Local", en: "Local" }, { fr: "Nuitée", en: "Overnight" }],
  },
  {
    key: "apartments", type: "apartment",
    title: { fr: "Appartements & locations", en: "Apartments & rentals" },
    summary: { fr: "Trouvez des appartements meublés et locations de courte durée pour voyager en autonomie.", en: "Find furnished apartments and short stays for more independent travel." },
    details: { fr: "Confirmez l’identité de l’hôte, l’adresse et les modalités de paiement", en: "Confirm the host, address and payment terms" },
    query: { fr: "appartements meublés location courte durée", en: "furnished apartments short stay" },
    tags: [{ fr: "Meublé", en: "Furnished" }, { fr: "Famille", en: "Family" }, { fr: "Long séjour", en: "Long stay" }],
  },
  {
    key: "restaurants", type: "restaurant",
    title: { fr: "Restaurants & cuisine locale", en: "Restaurants & local food" },
    summary: { fr: "Découvrez les tables camerounaises, grillades, poisson, plats régionaux et cuisines internationales.", en: "Discover Cameroonian tables, grills, fish, regional dishes and international food." },
    details: { fr: "Menus, horaires et modes de paiement à vérifier le jour même", en: "Check menus, hours and payment methods the same day" },
    query: { fr: "restaurants cuisine camerounaise", en: "restaurants Cameroonian food" },
    tags: [{ fr: "Cuisine locale", en: "Local food" }, { fr: "En famille", en: "Family-friendly" }, { fr: "Découverte", en: "Discovery" }],
  },
  {
    key: "fastfood", type: "fastfood",
    title: { fr: "Fast-foods & snacks", en: "Fast food & snacks" },
    summary: { fr: "Repérez rapidement burgers, poulet, pizza, shawarma, boulangeries et restauration camerounaise rapide.", en: "Quickly find burgers, chicken, pizza, shawarma, bakeries and Cameroonian fast food." },
    details: { fr: "Consultez les horaires, notes et options de livraison sur la carte", en: "Check hours, ratings and delivery options on the map" },
    query: { fr: "fast food snack burgers pizza", en: "fast food snacks burgers pizza" },
    tags: [{ fr: "Rapide", en: "Quick" }, { fr: "À emporter", en: "Takeaway" }, { fr: "Livraison", en: "Delivery" }],
  },
  {
    key: "car-rental", type: "car-rental",
    title: { fr: "Location de véhicules", en: "Car rental" },
    summary: { fr: "Comparez les agences, véhicules avec ou sans chauffeur et points de prise en charge disponibles.", en: "Compare agencies, self-drive or chauffeur options and available pickup points." },
    details: { fr: "Contrat, assurance, caution, permis et état du véhicule à contrôler", en: "Check contract, insurance, deposit, licence and vehicle condition" },
    query: { fr: "location de voitures agence véhicule avec chauffeur", en: "car rental agency chauffeur" },
    tags: [{ fr: "Mobilité", en: "Mobility" }, { fr: "Chauffeur", en: "Driver" }, { fr: "Assurance", en: "Insurance" }],
  },
];

function googleMapsSearch(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const regionalServicePlaces: TouristPlace[] = regionalHubs.flatMap((hub) =>
  serviceBlueprints.map((service, index) => {
    const mapsQuery = `${service.query.fr}, ${hub.city}, Cameroun`;
    return {
      id: `${service.key}-${hub.city.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`,
      name: `${service.title.fr} · ${hub.city}`,
      type: service.type,
      city: hub.city,
      region: hub.region,
      area: { fr: `${hub.region.fr} · autour de ${hub.city}`, en: `${hub.region.en} · around ${hub.city}` },
      coordinates: { lat: hub.coordinates.lat + index * 0.003, lng: hub.coordinates.lng + index * 0.002 },
      summary: service.summary,
      details: service.details,
      tags: service.tags,
      destinationSlugs: hub.destinationSlugs,
      sourceUrl: googleMapsSearch(mapsQuery),
      mapsQuery,
    };
  }),
);

const expandedAdventureSlugs = new Set(["waza", "benoue", "tello", "lake-awing", "limbe", "dja", "lobeke"]);
const regionalAdventurePlaces: TouristPlace[] = destinations
  .filter((destination) => expandedAdventureSlugs.has(destination.slug))
  .map((destination, index) => ({
    id: `adventure-${destination.slug}`,
    name: destination.name,
    type: "activity",
    city: destination.slug === "waza" ? "Waza" : destination.slug === "benoue" ? "Garoua" : destination.slug === "tello" ? "Ngaoundéré" : destination.slug === "lake-awing" ? "Bamenda" : destination.slug === "limbe" ? "Limbé" : destination.slug === "dja" ? "Lomié" : "Moloundou",
    region: destination.region,
    area: { fr: destination.region.fr, en: destination.region.en },
    coordinates: [
      { lat: 11.33, lng: 14.55 }, { lat: 8.31, lng: 13.94 }, { lat: 7.18, lng: 13.73 },
      { lat: 5.86, lng: 10.13 }, { lat: 4.01, lng: 9.2 }, { lat: 3.05, lng: 13.3 }, { lat: 2.23, lng: 15.75 },
    ][index],
    summary: destination.summary,
    details: { fr: `${destination.duration.fr} · meilleure période : ${destination.season.fr} · accompagnement local recommandé`, en: `${destination.duration.en} · best period: ${destination.season.en} · local guidance recommended` },
    tags: destination.highlights,
    destinationSlugs: [destination.slug],
    sourceUrl: destination.imagePage,
    mapsQuery: `${destination.name}, Cameroun`,
    image: destination.image,
    imageAlt: { fr: destination.name, en: destination.name },
    imagePage: destination.imagePage,
    imageCredit: destination.credit,
    imageLicense: destination.license,
    imageKind: "place",
  }));

const verifiedCarRentals: TouristPlace[] = [
  {
    id: "avis-yaounde", name: "Avis Yaoundé", type: "car-rental", city: "Yaoundé", region: { fr: "Centre", en: "Centre" },
    area: { fr: "Hilton Yaoundé et agence centre-ville", en: "Hilton Yaoundé and downtown branch" },
    coordinates: { lat: 3.8646, lng: 11.5157 },
    summary: { fr: "Deux points de location annoncés à Yaoundé, dont un au Hilton.", en: "Two advertised rental points in Yaoundé, including one at the Hilton." },
    details: { fr: "Horaires, catégorie, assurance et disponibilité à confirmer", en: "Confirm hours, category, insurance and availability" },
    tags: [{ fr: "Agence", en: "Agency" }, { fr: "Centre-ville", en: "City centre" }, { fr: "Véhicules", en: "Vehicles" }],
    destinationSlugs: ["yaounde"], sourceUrl: "https://www.avis.com/en/locations/af/cm/yaounde", mapsQuery: "Avis car rental Yaoundé Cameroon",
  },
  {
    id: "avis-douala-airport", name: "Avis Douala Aéroport", type: "car-rental", city: "Douala", region: { fr: "Littoral", en: "Littoral" },
    area: { fr: "Aéroport international de Douala", en: "Douala International Airport" },
    coordinates: { lat: 4.0061, lng: 9.7195 },
    summary: { fr: "Un point de prise en charge annoncé directement à l’aéroport de Douala.", en: "An advertised pickup point directly at Douala airport." },
    details: { fr: "Réservation, dépôt, assurance et retour à confirmer", en: "Confirm booking, deposit, insurance and return" },
    tags: [{ fr: "Aéroport", en: "Airport" }, { fr: "Agence", en: "Agency" }, { fr: "Prise en charge", en: "Pickup" }],
    destinationSlugs: ["ekom-nkam"], sourceUrl: "https://www.avis.com/en/locations/af/cm/douala/dla", mapsQuery: "Avis car rental Douala Airport Cameroon",
  },
];

export const tourismPlaces: TouristPlace[] = [
  ...featuredTourismPlaces,
  ...regionalAdventurePlaces,
  ...verifiedCarRentals,
  ...regionalServicePlaces,
];

const cityRegionMap = new Map(regionalHubs.map((hub) => [hub.city, hub.region]));
for (const place of tourismPlaces) if (place.region) cityRegionMap.set(place.city, place.region);

export function getPlaceRegion(place: TouristPlace): Localized {
  return place.region ?? cityRegionMap.get(place.city) ?? { fr: place.city, en: place.city };
}

export const tourismCities = [...new Set(tourismPlaces.map((place) => place.city))].sort();
export const tourismRegions = [...new Set(regionalHubs.map((hub) => hub.region.fr))];

export const tourismTypeLabels: Record<TouristPlaceType | "all", Localized> = {
  all: { fr: "Tout voir", en: "All places" },
  hotel: { fr: "Hôtels", en: "Hotels" },
  motel: { fr: "Motels", en: "Motels" },
  apartment: { fr: "Apparts", en: "Apartments" },
  restaurant: { fr: "Restaurants", en: "Restaurants" },
  fastfood: { fr: "Fast-food", en: "Fast food" },
  "car-rental": { fr: "Véhicules", en: "Car rental" },
  activity: { fr: "À faire", en: "Things to do" },
};

export const tourismTypeIcons: Record<TouristPlaceType, string> = {
  hotel: "⌂",
  motel: "▤",
  apartment: "▦",
  restaurant: "◒",
  fastfood: "◉",
  "car-rental": "◆",
  activity: "✦",
};
