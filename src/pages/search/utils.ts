export const normalizeSearchMode = (value: unknown): "strict" | "broad" | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("strict")) return "strict";
  if (normalized.includes("broad")) return "broad";
  return null;
};

export const isZitounMask = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("zitoun mask") ||
    normalized.includes("zitoun musk") ||
    normalized.includes("zitoun mas") ||
    normalized.includes("zitoun mus")
  );
};

export const isSosMedecinQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("sos médecin") ||
    normalized.includes("sos medecin") ||
    normalized.includes("sos docteur") ||
    normalized.includes("besoin d'un docteur") ||
    normalized.includes("besoin d un docteur") ||
    normalized.includes("besoin d'un médecin") ||
    normalized.includes("besoin d un medecin") ||
    normalized.includes("médecin urgence") ||
    normalized.includes("medecin urgence") ||
    normalized.includes("docteur urgence") ||
    normalized.includes("urgence médicale") ||
    normalized.includes("urgence medicale") ||
    normalized.includes("appeler un médecin") ||
    normalized.includes("appeler un medecin") ||
    normalized.includes("appeler un docteur") ||
    normalized.includes("je suis malade") ||
    normalized.includes("mal en point")
  );
};

export const isPompiersQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("pompier") ||
    normalized.includes("incendie") ||
    normalized.includes("il y a le feu") ||
    normalized.includes("ça brûle") ||
    normalized.includes("ca brule") ||
    normalized.includes("tout brûle") ||
    normalized.includes("maison en feu") ||
    normalized.includes("voiture en feu") ||
    normalized.includes("feu de forêt") ||
    normalized.includes("feu de foret") ||
    normalized.includes("appeler les pompiers") ||
    normalized.includes("sapeurs") ||
    normalized.includes("brigade") ||
    normalized.includes("protection civile feu") ||
    /\bau feu\b/.test(normalized) && !normalized.includes("feu de bois") && !normalized.includes("feu de charbon") && !normalized.includes("feu de braise")
  );
};

export const isCelebrityQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    normalized.includes("célébrité") ||
    normalized.includes("celebrite") ||
    normalized.includes("célébrités") ||
    normalized.includes("star ") ||
    normalized.includes("stars ") ||
    normalized.includes("people marrakech") ||
    normalized.includes("vip marrakech") ||
    normalized.includes("famous") ||
    normalized.includes("personnalité")
  );
};

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const formatDateFr = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

export const ITEMS_PER_PAGE = 20;
export const SERVER_PAGE_SIZE = ITEMS_PER_PAGE + 1;

// AI refinement chat — cap user turns to keep token cost bounded.
export const AI_CHAT_MAX_TURNS = 4;

// Supabase paging when fetching all map businesses for a city.
export const MAP_FETCH_PAGE_SIZE = 1000;

// pinIds mode: page 1 shows 23 businesses (AI suggestion card takes slot #4 → 24 cards total).
export const PIN_PAGE1_SIZE = ITEMS_PER_PAGE + 3;

// Stopwords used by the AI refinement AND-filter tokenizer.
export const REFINEMENT_STOPWORDS = new Set([
  "avec","sans","pour","dans","des","les","une","un","la","le","de","du","et","ou","au","aux",
  "with","without","for","the","and","or","of","a","an","in","on","to",
  "qui","que","est","sont","plus","moins","tres","tout","tous","toute","toutes",
]);

// "Nouvelle entité à proximité" — ex. "avec un golf à côté", "et un spa proche".
export const NEARBY_ENTITY_RE = /(?:^|(?<!\p{L}))(?:avec|et|and|with|plus)\s+(?:un|une|des|du|de\s+la|le|la|les|a|an|some)?\s*([\p{L}][\p{L}\-']{2,})\s+(?:à\s+côté|a\s+cote|à\s+coté|à\s+proximité|a\s+proximite|près|pres|proche|aux\s+alentours|nearby|around|close\s+by)(?!\p{L})/iu;
export const NEAR_OF_ENTITY_RE = /(?:à\s+côté|a\s+cote|près|pres|proche|à\s+proximité|nearby|close\s+to|next\s+to)\s+d['’]?\s*(?:un|une|des|a|an)?\s*([\p{L}][\p{L}\-']{2,})(?!\p{L})/iu;

// Termes trop génériques pour déclencher une recherche "nouvelle entité à proximité".
export const GENERIC_NEARBY_TERMS = new Set([
  "chose","truc","endroit","lieu","place","spot","activite","activité",
  "côté","cote","côte","resultat","résultat","résultats","resultats",
]);

// IDs des établissements du guide célébrités (dans l'ordre d'affichage souhaité)
export const CELEBRITY_IDS = [
  "3bb71910-c17e-4ce1-a130-42c369a645a7", // La Mamounia
  "0961b2f5-c259-483a-b877-3d251acdbbd9", // Royal Mansour
  "e7019579-408a-4b3c-90d7-41c6dbff9063", // Amanjena
  "590225e3-0887-4d79-a8f6-571ac148cca5", // Mandarin Oriental
  "641ab942-63a5-499e-999a-e09915b1d02f", // Boutique El Fenn
  "5b09bebd-7cb5-4698-b447-bf5f198811f4", // Selman Marrakech
  "307aa4e4-03b7-4006-808c-6df07c6b5eab", // Riad Kniza
  "c5a21f81-94fc-4b5e-8f89-822a43dabdec", // Nobu Marrakech
  "da42a132-4948-4c5f-afa3-f0b37df6811e", // Dar Yacout
  "c6af063a-0636-4746-bd14-50060721e5f5", // Restaurant Le Jardin
  "d04e2a2b-faa4-4675-b861-c8f90df30c7f", // Rooftop Bar El Fenn
  "be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d", // Theatro Marrakech
  "21dfaabb-56fe-4da0-9942-34b2803465cf", // Comptoir Darna
];
