/**
 * Catalogue curaté d'icônes pour le Storyboard vidéo (backoffice Vidéos).
 *
 * Règle: on ne stocke JAMAIS de SVG ni de composant, uniquement une clé texte
 * sérialisable "famille:NomIcone" (ex. "tb:TbToolsKitchen2").
 * Les familles correspondent aux préfixes react-icons: tb, fa6, md, io5, bs, hi2, ri, si.
 */

export type IconFamily = "tb" | "fa6" | "md" | "io5" | "bs" | "hi2" | "ri" | "si";

export const ICON_FAMILY_LABELS: Record<IconFamily, string> = {
  tb: "Tabler",
  fa6: "Font Awesome 6",
  md: "Material",
  io5: "Ionicons 5",
  bs: "Bootstrap",
  hi2: "Heroicons 2",
  ri: "Remix",
  si: "Simple Icons (marques)",
};

export type CuratedIcon = {
  /** Clé sérialisée stockée en base, ex. "tb:TbToolsKitchen2" */
  key: string;
  /** Libellé FR affiché dans le picker */
  label: string;
  /** Mots-clés de recherche (FR + EN) */
  keywords: string[];
};

export type IconCategory = {
  id: string;
  label: string;
  icons: CuratedIcon[];
};

const i = (key: string, label: string, ...keywords: string[]): CuratedIcon => ({
  key,
  label,
  keywords: [label.toLowerCase(), ...keywords],
});

export const VIDEO_ICON_CATALOG: IconCategory[] = [
  {
    id: "hospitality",
    label: "Hôtellerie & Restauration",
    icons: [
      i("fa6:FaHotel", "Hôtel", "hotel", "riad", "hebergement"),
      i("tb:TbBed", "Chambre", "lit", "bed", "suite"),
      i("tb:TbToolsKitchen2", "Restaurant", "cuisine", "table", "food"),
      i("md:MdRestaurantMenu", "Menu", "carte", "menu"),
      i("md:MdOutlineRoomService", "Room service", "service", "chambre"),
      i("tb:TbCoffee", "Café", "coffee", "petit-dejeuner", "breakfast"),
      i("tb:TbGlassCocktail", "Bar / Cocktail", "bar", "cocktail", "drink"),
      i("tb:TbGlassFull", "Vin", "wine", "verre"),
      i("md:MdOutlinePool", "Piscine", "pool", "swimming"),
      i("tb:TbToolsKitchen", "Chef", "gastronomie", "kitchen"),
      i("tb:TbCake", "Pâtisserie", "gateau", "dessert", "cake"),
      i("tb:TbSoup", "Tajine / Soupe", "soup", "plat", "tajine"),
    ],
  },
  {
    id: "experiences",
    label: "Expériences & Activités",
    icons: [
      i("tb:TbCamel", "Dromadaire", "camel", "desert", "chameau"),
      i("tb:TbTent", "Camp / Bivouac", "tent", "camping", "desert"),
      i("tb:TbBike", "Vélo / VTT", "bike", "cycling"),
      i("tb:TbHorseToy", "Cheval", "horse", "equitation", "caleche"),
      i("md:MdOutlineHiking", "Randonnée", "hiking", "trek", "atlas"),
      i("tb:TbSailboat", "Bateau", "boat", "voile", "sailing"),
      i("tb:TbBallon", "Montgolfière", "balloon", "vol", "air"),
      i("tb:TbSurfboard", "Surf", "surfing", "essaouira", "vague"),
      i("tb:TbScubaMask", "Plongée", "diving", "snorkeling"),
      i("md:MdOutlineKitesurfing", "Kitesurf", "kite", "vent", "wind"),
      i("tb:TbCooker", "Cours de cuisine", "cooking class", "atelier"),
      i("tb:TbTicket", "Billetterie", "ticket", "entree", "billet"),
    ],
  },
  {
    id: "services",
    label: "Services & Logistique",
    icons: [
      i("tb:TbTaxi", "Taxi", "taxi", "vtc"),
      i("tb:TbPlane", "Avion / Aéroport", "plane", "airport", "vol"),
      i("tb:TbLuggage", "Bagage", "luggage", "valise", "consigne"),
      i("tb:TbWifi", "Wifi", "wifi", "internet"),
      i("tb:TbParking", "Parking", "parking", "voiture"),
      i("tb:TbBellRinging", "Réception", "reception", "conciergerie", "bell"),
      i("tb:TbCalendarCheck", "Réservation", "booking", "reservation", "agenda"),
      i("tb:TbCreditCard", "Paiement", "payment", "carte", "cb"),
      i("tb:TbClock24", "Ouvert 24/7", "24h", "horaires", "clock"),
      i("tb:TbShieldCheck", "Sécurité / Garantie", "secure", "trust", "verifie"),
      i("tb:TbTruckDelivery", "Livraison", "delivery", "transfert"),
      i("tb:TbHeadset", "Support", "assistance", "hotline"),
    ],
  },
  {
    id: "ambiance",
    label: "Ambiance & Lieu",
    icons: [
      i("tb:TbBeach", "Plage", "beach", "mer", "essaouira"),
      i("tb:TbCactus", "Désert", "desert", "cactus", "sahara"),
      i("tb:TbMountain", "Montagne", "mountain", "atlas"),
      i("tb:TbBuildingMonument", "Médina / Monument", "medina", "monument", "koutoubia"),
      i("tb:TbSun", "Soleil", "sun", "jour", "meteo"),
      i("tb:TbMoonStars", "Nuit", "moon", "night", "soiree"),
      i("tb:TbMusic", "Musique", "music", "gnawa", "live"),
      i("tb:TbFlower", "Jardin", "garden", "flower", "majorelle"),
      i("tb:TbPalmtree", "Palmeraie", "palm", "palmier", "oasis"),
      i("tb:TbSunset2", "Coucher de soleil", "sunset", "rooftop"),
    ],
  },
  {
    id: "actions",
    label: "Actions & UI",
    icons: [
      i("tb:TbPhone", "Téléphone", "phone", "appel", "call"),
      i("si:SiWhatsapp", "WhatsApp", "whatsapp", "message"),
      i("tb:TbMail", "Email", "mail", "contact"),
      i("tb:TbShare2", "Partager", "share", "partage"),
      i("tb:TbStarFilled", "Étoile / Avis", "star", "note", "review"),
      i("tb:TbHeartFilled", "Favori", "heart", "coeur", "like"),
      i("tb:TbMapPin", "Localisation", "map", "pin", "adresse"),
      i("tb:TbArrowRight", "Flèche droite", "arrow", "suite", "next"),
      i("tb:TbExternalLink", "Lien externe", "link", "site", "web"),
      i("tb:TbQrcode", "QR Code", "qr", "scan"),
      i("tb:TbDeviceMobile", "Mobile", "mobile", "app", "smartphone"),
      i("tb:TbSearch", "Recherche", "search", "trouver"),
    ],
  },
  {
    id: "golf-sport",
    label: "Golf & Sport",
    icons: [
      i("tb:TbGolf", "Golf", "golf", "green", "tee"),
      i("md:MdOutlineSportsGolf", "Balle de golf", "golf ball", "putt"),
      i("tb:TbBarbell", "Fitness", "gym", "musculation", "salle"),
      i("tb:TbRun", "Running", "course", "run", "jogging"),
      i("tb:TbYoga", "Yoga", "yoga", "pilates", "stretching"),
      i("tb:TbSwimming", "Natation", "swim", "piscine", "nage"),
      i("md:MdOutlineSportsTennis", "Tennis", "tennis", "padel", "raquette"),
      i("tb:TbSoccerField", "Football", "foot", "terrain", "soccer"),
    ],
  },
  {
    id: "wellness",
    label: "Bien-être & Spa",
    icons: [
      i("tb:TbMassage", "Massage", "massage", "soin"),
      i("md:MdOutlineSpa", "Spa", "spa", "detente", "relax"),
      i("tb:TbBath", "Hammam", "hammam", "bain", "bath"),
      i("tb:TbHotelService", "Soin / Rituel", "soin", "rituel", "service"),
      i("tb:TbDropletFilled", "Jacuzzi / Eau", "jacuzzi", "eau", "water"),
      i("tb:TbFlower2", "Aromathérapie", "huile", "aroma", "argan"),
      i("tb:TbMoodSmile", "Détente", "relax", "bien-etre", "calme"),
      i("md:MdOutlineSelfImprovement", "Méditation", "meditation", "zen"),
    ],
  },
  {
    id: "wedding",
    label: "Mariage & Événement",
    icons: [
      i("tb:TbHeartHandshake", "Mariage", "wedding", "mariage", "union"),
      i("tb:TbCake", "Gâteau", "cake", "piece montee"),
      i("tb:TbGlassChampagne", "Champagne", "toast", "celebration"),
      i("tb:TbFlower", "Décoration florale", "fleurs", "flowers", "arche"),
      i("tb:TbConfetti", "Célébration", "confetti", "fete", "party"),
      i("md:MdOutlineCelebration", "Réception", "reception", "event"),
      i("tb:TbCamera", "Photographe", "photo", "photographer"),
      i("tb:TbMusic", "DJ / Orchestre", "dj", "musique", "live"),
    ],
  },
  {
    id: "mice",
    label: "MICE & Corporate",
    icons: [
      i("tb:TbUsersGroup", "Séminaire", "seminaire", "groupe", "meeting"),
      i("tb:TbPresentation", "Présentation", "presentation", "conference"),
      i("tb:TbDeviceProjector", "Projecteur", "projector", "video", "salle"),
      i("tb:TbBriefcase", "Business", "corporate", "b2b", "pro"),
      i("tb:TbBuildingSkyscraper", "Centre d'affaires", "business center", "bureau"),
      i("tb:TbDeviceLaptop", "Coworking", "coworking", "laptop", "teletravail"),
      i("tb:TbTargetArrow", "Team building", "team", "objectif", "cohesion"),
      i("tb:TbMicrophone2", "Conférence", "micro", "keynote", "conference"),
    ],
  },
  {
    id: "shopping",
    label: "Shopping & Artisanat",
    icons: [
      i("tb:TbShoppingBag", "Boutique", "shop", "boutique", "achat"),
      i("tb:TbBuildingStore", "Souk", "souk", "store", "marche"),
      i("tb:TbCarpet", "Tapis", "tapis", "carpet", "berbere"),
      i("tb:TbBottle", "Poterie / Céramique", "poterie", "ceramique", "artisanat"),
      i("tb:TbDiamond", "Bijoux", "bijoux", "jewelry", "argent"),
      i("tb:TbBackpack", "Cuir / Maroquinerie", "cuir", "leather", "sac"),
      i("tb:TbShirt", "Mode / Caftan", "mode", "caftan", "vetement"),
      i("tb:TbGift", "Souvenir", "cadeau", "gift", "souvenir"),
    ],
  },
  {
    id: "culture",
    label: "Culture & Patrimoine",
    icons: [
      i("tb:TbBuildingCastle", "Palais", "palais", "kasbah", "castle"),
      i("tb:TbBuildingMosque", "Mosquée / Medersa", "mosquee", "medersa", "minaret"),
      i("tb:TbBuildingBank", "Musée", "musee", "museum", "galerie"),
      i("tb:TbBook2", "Histoire", "histoire", "livre", "patrimoine"),
      i("tb:TbBrush", "Art", "art", "peinture", "atelier"),
      i("tb:TbTheater", "Spectacle", "theatre", "show", "scene"),
      i("tb:TbArtboard", "Galerie d'art", "galerie", "expo", "art"),
      i("tb:TbLanguage", "Langues / Guide", "guide", "langue", "traduction"),
    ],
  },
  {
    id: "transport",
    label: "Transport & Transfert",
    icons: [
      i("tb:TbPlaneDeparture", "Vol", "avion", "depart", "flight"),
      i("tb:TbTrain", "Train", "train", "oncf", "gare"),
      i("tb:TbCar", "Voiture", "car", "location", "rental"),
      i("tb:TbSteeringWheel", "Chauffeur privé", "chauffeur", "driver", "vtc"),
      i("tb:TbBus", "Bus / Navette", "bus", "navette", "shuttle"),
      i("tb:TbMotorbike", "Scooter / Quad", "scooter", "quad", "moto"),
      i("tb:TbRoute", "Itinéraire", "route", "trajet", "distance"),
      i("tb:TbParkingCircle", "Stationnement", "parking", "voiturier"),
    ],
  },
  {
    id: "family",
    label: "Accessibilité & Famille",
    icons: [
      i("tb:TbUsers", "Famille", "famille", "family", "groupe"),
      i("tb:TbBabyCarriage", "Enfants", "enfant", "kids", "bebe"),
      i("tb:TbWheelchair", "Accessibilité", "pmr", "accessible", "fauteuil"),
      i("tb:TbDog", "Animaux acceptés", "chien", "pet", "animal"),
      i("tb:TbPlayCard", "Jeux", "jeux", "kids club", "games"),
      i("tb:TbFriends", "Groupes", "groupe", "amis", "friends"),
    ],
  },
  {
    id: "nightlife",
    label: "Musique & Nightlife",
    icons: [
      i("tb:TbDisc", "DJ", "dj", "mix", "disc"),
      i("tb:TbMicrophone", "Concert", "concert", "live", "chant"),
      i("tb:TbBuildingPavilion", "Rooftop", "rooftop", "terrasse", "vue"),
      i("tb:TbDisco", "Club", "club", "boite", "nightclub"),
      i("tb:TbSparkles", "Soirée", "soiree", "party", "night"),
      i("tb:TbSpeakerphone", "Sono", "sono", "sound", "audio"),
    ],
  },
  {
    id: "views",
    label: "Photographie & Vue",
    icons: [
      i("tb:TbPanoramaHorizontal", "Panorama", "panorama", "vue", "360"),
      i("tb:TbCamera", "Photo", "photo", "camera", "shooting"),
      i("tb:TbDrone", "Drone", "drone", "aerien", "vue du ciel"),
      i("tb:TbSunset", "Coucher de soleil", "sunset", "golden hour"),
      i("tb:TbBinoculars", "Point de vue", "vue", "belvedere", "observation"),
      i("tb:TbVideo", "Vidéo", "video", "film", "tournage"),
    ],
  },
  {
    id: "sustainability",
    label: "Durabilité",
    icons: [
      i("tb:TbLeaf", "Éco-responsable", "eco", "vert", "green"),
      i("tb:TbPlant2", "Bio", "bio", "organic", "nature"),
      i("tb:TbRecycle", "Recyclage", "recycle", "dechets", "zero waste"),
      i("tb:TbSolarPanel", "Énergie solaire", "solaire", "solar", "energie"),
      i("tb:TbDroplet", "Économie d'eau", "eau", "water", "hydrique"),
      i("tb:TbHandHeart", "Local / Solidaire", "local", "terroir", "solidaire"),
    ],
  },
  {
    id: "brands",
    label: "Marques & Partenaires",
    icons: [
      i("si:SiGoogle", "Google", "google", "avis", "reviews"),
      i("si:SiApple", "Apple", "apple", "ios"),
      i("si:SiInstagram", "Instagram", "instagram", "insta", "social"),
      i("si:SiFacebook", "Facebook", "facebook", "meta", "social"),
      i("si:SiTripadvisor", "TripAdvisor", "tripadvisor", "avis"),
      i("si:SiYoutube", "YouTube", "youtube", "video"),
      i("si:SiBookingdotcom", "Booking.com", "booking", "ota"),
      i("si:SiAirbnb", "Airbnb", "airbnb", "ota"),
      i("si:SiWhatsapp", "WhatsApp", "whatsapp", "message"),
      i("si:SiTiktok", "TikTok", "tiktok", "social"),
    ],
  },
];

/** Toutes les icônes à plat (dédoublonnées par clé). */
export const VIDEO_ICONS_FLAT: CuratedIcon[] = (() => {
  const seen = new Set<string>();
  const out: CuratedIcon[] = [];
  for (const cat of VIDEO_ICON_CATALOG) {
    for (const icon of cat.icons) {
      if (seen.has(icon.key)) continue;
      seen.add(icon.key);
      out.push(icon);
    }
  }
  return out;
})();

export const parseIconKey = (key: string): { family: IconFamily; name: string } | null => {
  const [family, name] = key.split(":");
  if (!family || !name) return null;
  if (!(family in ICON_FAMILY_LABELS)) return null;
  return { family: family as IconFamily, name };
};

export const searchVideoIcons = (query: string, categoryId?: string): CuratedIcon[] => {
  const pool =
    categoryId && categoryId !== "all"
      ? VIDEO_ICON_CATALOG.find((c) => c.id === categoryId)?.icons ?? []
      : VIDEO_ICONS_FLAT;
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (icon) =>
      icon.label.toLowerCase().includes(q) ||
      icon.key.toLowerCase().includes(q) ||
      icon.keywords.some((k) => k.includes(q)),
  );
};
