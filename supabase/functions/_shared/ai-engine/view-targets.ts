// ---------------------------------------------------------------------------
// « Vue sur X » — deux natures de vue, deux stratégies.
//
//  1) PANORAMA (Atlas, montagne, mer/océan, ville/médina, désert, palmeraie) :
//     aucune géométrie possible (l'Atlas est à 50 km de Marrakech et pourtant
//     visible). On s'appuie sur les services/badges déjà présents en base
//     (« Vue montagne », « Vue sur mer », « Vue sur la ville ») → filtre DUR
//     déterministe, zéro token. La preuve textuelle sert de secours.
//
//  2) POINT (Koutoubia, Jemaa el-Fna, Ménara, Bab Agnaou, port d'Essaouira) :
//     repère ponctuel géolocalisé → rayon (≈1 km) autour du point comme filtre,
//     la preuve textuelle ne servant qu'à classer.
//
// Source unique de vérité, partagée par club-ai-chat et embed-ai-chat.
// ---------------------------------------------------------------------------

export const normView = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Le membre demande-t-il explicitement une vue ? (« vue sur », « face à », « overlooking »…) */
const VIEW_INTENT_RE =
  /\b(vue|vues|donnant\s+sur|face\s+(?:a|au|aux)|overlooking|view\s+of|views\s+of|with\s+a\s+view|panoram\w*)\b/;

export type ViewPanorama = {
  slug: string;
  label: string;
  /** mots déclencheurs (texte normalisé sans accents) */
  tokens: RegExp;
  /** noms EXACTS des services/badges existants en base */
  attributeNames: string[];
  /** preuve textuelle de secours */
  proof: RegExp;
};

export const VIEW_PANORAMAS: ViewPanorama[] = [
  {
    slug: "montagne",
    label: "vue montagne / Atlas",
    tokens: /\b(atlas|montagne|montagnes|mountain|mountains|toubkal|sommets)\b/,
    attributeNames: ["Vue montagne", "Vue sur la montagne", "Montagne"],
    proof: /\b(atlas|montagne|montagnes|mountain|mountains|toubkal)\b/,
  },
  {
    slug: "mer",
    label: "vue sur mer",
    tokens: /\b(mer|ocean|atlantique|sea|seaside|plage|beach|front\s+de\s+mer)\b/,
    attributeNames: ["Vue sur mer", "Vue mer", "Vue sur l'océan"],
    proof: /\b(mer|ocean|atlantique|sea|plage|beach)\b/,
  },
  {
    slug: "ville",
    label: "vue sur la ville",
    tokens: /\b(ville|city|medina|toits|rooftops|skyline)\b/,
    attributeNames: ["Vue sur la ville", "Vue ville"],
    proof: /\b(ville|city|medina|toits|skyline)\b/,
  },
  {
    slug: "desert",
    label: "vue désert / palmeraie",
    tokens: /\b(desert|dunes|palmeraie|palm\s+grove)\b/,
    attributeNames: ["Vue désert", "Vue palmeraie", "Palmeraie"],
    proof: /\b(desert|dunes|palmeraie)\b/,
  },
];

export type ViewPoint = {
  slug: string;
  label: string;
  tokens: RegExp;
  lat: number;
  lng: number;
  radiusKm: number;
};

export const VIEW_POINTS: ViewPoint[] = [
  { slug: "koutoubia", label: "Koutoubia", tokens: /\b(koutoubia|kutubiyya)\b/, lat: 31.6242, lng: -7.9930, radiusKm: 1 },
  { slug: "jemaa-el-fna", label: "Jemaa el-Fna", tokens: /\b(jemaa\s*el[- ]?fna|jamaa\s*el[- ]?fna|djemaa|place\s+jemaa)\b/, lat: 31.6258, lng: -7.9891, radiusKm: 0.8 },
  { slug: "menara", label: "Ménara", tokens: /\bmenara\b/, lat: 31.6115, lng: -8.0230, radiusKm: 1.2 },
  { slug: "bab-agnaou", label: "Bab Agnaou", tokens: /\bbab\s+agnaou\b/, lat: 31.6183, lng: -7.9895, radiusKm: 0.8 },
  { slug: "bahia", label: "Palais Bahia", tokens: /\b(bahia)\b/, lat: 31.6218, lng: -7.9832, radiusKm: 0.8 },
  { slug: "majorelle", label: "Jardin Majorelle", tokens: /\bmajorelle\b/, lat: 31.6417, lng: -8.0031, radiusKm: 1 },
  { slug: "sqala", label: "Sqala", tokens: /\bsqala\b/, lat: 31.5121, lng: -9.7726, radiusKm: 0.8 },
  { slug: "port-essaouira", label: "Port d'Essaouira", tokens: /\bport\b/, lat: 31.5107, lng: -9.7752, radiusKm: 1 },
];

export type ViewIntent = {
  /** l'utilisateur a bien exprimé une intention de vue */
  hasViewIntent: boolean;
  panoramas: ViewPanorama[];
  points: ViewPoint[];
};

/** Détecte l'intention « vue sur X » et classe la/les cibles en panorama vs point. */
export function detectViewIntent(rawText: string): ViewIntent {
  const n = normView(rawText);
  const hasViewIntent = VIEW_INTENT_RE.test(n);
  if (!hasViewIntent) return { hasViewIntent: false, panoramas: [], points: [] };
  return {
    hasViewIntent: true,
    panoramas: VIEW_PANORAMAS.filter((p) => p.tokens.test(n)),
    points: VIEW_POINTS.filter((p) => p.tokens.test(n)),
  };
}

/** Un établissement porte-t-il l'attribut (service ou badge) du panorama ? */
export function hasPanoramaAttribute(
  panorama: ViewPanorama,
  opts: { services?: unknown; badgeNames?: string[] },
): boolean {
  const wanted = panorama.attributeNames.map(normView);
  const services = Array.isArray(opts.services) ? opts.services.map(normView) : [];
  const badges = (opts.badgeNames || []).map(normView);
  return [...services, ...badges].some((v) => wanted.includes(v));
}

/** Preuve textuelle de secours (nom, hook, description, highlights…). */
export function hasPanoramaProof(panorama: ViewPanorama, text: string): boolean {
  return panorama.proof.test(normView(text));
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** L'établissement est-il dans le rayon du repère ponctuel ? */
export function withinPointRadius(point: ViewPoint, lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  return distanceKm(point.lat, point.lng, lat, lng) <= point.radiusKm;
}

/* ------------------------------------------------------------------------- *
 *  Point de vue (« vantage ») : être à 300 m de la Koutoubia ne donne pas
 *  une vue dessus. Un repère ponctuel exige donc, en plus de la proximité,
 *  une preuve de surélévation / panorama (attribut en base ou texte).
 * ------------------------------------------------------------------------- */

export const VANTAGE_ATTRIBUTE_NAMES = [
  "Rooftop",
  "Roof top",
  "Terrasse",
  "Terrasse panoramique",
  "Terrasse sur le toit",
  "Vue sur la ville",
  "Vue panoramique",
  "Panorama",
];

const VANTAGE_PROOF_RE =
  /\b(rooftop|roof\s?top|sur\s+le\s+toit|sur\s+les\s+toits|terrasse\s+panoramique|terrasse\s+sur\s+le\s+toit|panoramique|panorama|vue\s+imprenable|vue\s+degagee|vue\s+plongeante|dernier\s+etage|belvedere)\b/;

/** Preuve d'un vrai point de vue : attribut en base OU texte. */
export function hasVantage(
  opts: { services?: unknown; badgeNames?: string[] },
  text: string,
): boolean {
  const wanted = VANTAGE_ATTRIBUTE_NAMES.map(normView);
  const services = Array.isArray(opts.services) ? opts.services.map(normView) : [];
  const badges = (opts.badgeNames || []).map(normView);
  if ([...services, ...badges].some((v) => wanted.includes(v))) return true;
  return VANTAGE_PROOF_RE.test(normView(text));
}

/** Le repère est-il explicitement cité comme vue dans le texte ? */
export function hasPointViewProof(point: ViewPoint, text: string): boolean {
  const t = normView(text);
  if (!point.tokens.test(t)) return false;
  return /\b(vue|vues|donnant\s+sur|face\s+(?:a|au|aux)|overlooking|view)\b/.test(t);
}
