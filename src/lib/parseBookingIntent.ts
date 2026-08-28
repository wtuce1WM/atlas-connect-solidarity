/**
 * Détection déterministe d'une intention de réservation d'hébergement en texte
 * libre (tapé ou vocal) + extraction des dates et du nombre d'adultes.
 *
 * Objectif : quand la demande est explicitement hôtelière ("je cherche une
 * chambre d'hôtel pour deux adultes à Marrakech du 27 septembre au 2 octobre"),
 * on ouvre le widget de disponibilité (SerpAPI) au lieu de laisser le modèle
 * répondre par une liste d'adresses non filtrée.
 */

export type BookingIntent = {
  checkIn: string | null;
  checkOut: string | null;
  adults: number | null;
  /** Ville nommée dans la question (null si absente → la ville du widget est conservée). */
  city: string | null;
};

/**
 * Villes couvertes par la recherche de disponibilité, avec leurs alias/quartiers.
 * Les clés sont normalisées (sans accent, minuscules).
 */
const CITY_PATTERNS: { city: string; aliases: string[] }[] = [
  { city: "Essaouira", aliases: ["essaouira", "mogador", "sidi kaouki", "الصويرة"] },
  { city: "Marrakech", aliases: ["marrakech", "marrakesh", "agafay", "asni", "imlil", "ourika", "مراكش"] },
];

/** Détecte la première ville nommée dans le texte (ordre d'apparition). */
function extractCity(text: string): string | null {
  let best: { idx: number; city: string } | null = null;
  for (const { city, aliases } of CITY_PATTERNS) {
    for (const alias of aliases) {
      const idx = text.indexOf(alias);
      if (idx >= 0 && (!best || idx < best.idx)) best = { idx, city };
    }
  }
  return best?.city ?? null;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const LODGING_RE =
  /\b(hotel|hotels|riad|riads|chambre|chambres|maison d hotes|maison d'hotes|hebergement|hebergements|room|rooms|guesthouse|dormir|nuit|nuits|night|nights|فندق|رياض|غرفة)\b/;
const BOOKING_VERB_RE =
  /\b(reserv\w*|booking|book|dispo\w*|availab\w*|cherche|chercher|recherche|trouver|libre|louer|sejour|احجز|حجز)\b/;

const MONTHS: Record<string, number> = {
  janvier: 1, january: 1, jan: 1,
  fevrier: 2, february: 2, feb: 2, fev: 2,
  mars: 3, march: 3, mar: 3,
  avril: 4, april: 4, apr: 4, avr: 4,
  mai: 5, may: 5,
  juin: 6, june: 6, jun: 6,
  juillet: 7, july: 7, jul: 7, juil: 7,
  aout: 8, august: 8, aug: 8,
  septembre: 9, september: 9, sep: 9, sept: 9,
  octobre: 10, october: 10, oct: 10,
  novembre: 11, november: 11, nov: 11,
  decembre: 12, december: 12, dec: 12,
};

const WORD_NUMBERS: Record<string, number> = {
  un: 1, une: 1, one: 1,
  deux: 2, two: 2,
  trois: 3, three: 3,
  quatre: 4, four: 4,
  cinq: 5, five: 5,
  six: 6, sept: 7, seven: 7, huit: 8, eight: 8,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Choisit l'année qui garde la date dans le futur proche (fenêtre de 12 mois). */
function resolveYear(month: number, day: number, ref: Date): number {
  const y = ref.getUTCFullYear();
  const candidate = Date.UTC(y, month - 1, day);
  const today = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  return candidate < today ? y + 1 : y;
}

function iso(month: number, day: number, ref: Date): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${resolveYear(month, day, ref)}-${pad(month)}-${pad(day)}`;
}

/** Extrait toutes les dates du texte, dans l'ordre d'apparition. */
function extractDates(text: string, ref: Date): string[] {
  const out: { idx: number; value: string }[] = [];
  const monthNames = Object.keys(MONTHS).join("|");

  // "27 septembre", "2 oct"
  const reWord = new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${monthNames})\\b`, "g");
  for (const m of text.matchAll(reWord)) {
    const v = iso(MONTHS[m[2]], parseInt(m[1], 10), ref);
    if (v) out.push({ idx: m.index ?? 0, value: v });
  }

  // "27/09", "27-09-2026", "2026-09-27"
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    out.push({ idx: m.index ?? 0, value: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` });
  }
  for (const m of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/g)) {
    const day = +m[1];
    const month = +m[2];
    if (month < 1 || month > 12) continue;
    const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : resolveYear(month, day, ref);
    out.push({ idx: m.index ?? 0, value: `${year}-${pad(month)}-${pad(day)}` });
  }

  return out
    .sort((a, b) => a.idx - b.idx)
    .map((d) => d.value)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function extractAdults(text: string): number | null {
  const numeric = text.match(/\b(\d{1,2})\s*(adultes?|adults?|personnes?|people|voyageurs?|pax|بالغين)\b/);
  if (numeric) {
    const n = parseInt(numeric[1], 10);
    if (n >= 1 && n <= 12) return n;
  }
  const words = Object.keys(WORD_NUMBERS).join("|");
  const worded = text.match(new RegExp(`\\b(${words})\\s+(adultes?|adults?|personnes?|people|voyageurs?)\\b`));
  if (worded) return WORD_NUMBERS[worded[1]];
  return null;
}

/**
 * Renvoie l'intention si le texte est une demande d'hébergement, sinon `null`.
 * Exige un terme d'hébergement + (un verbe de réservation/recherche OU des dates).
 */
export function parseBookingIntent(raw: string, now: Date = new Date()): BookingIntent | null {
  const text = norm(raw);
  if (!LODGING_RE.test(text)) return null;
  const dates = extractDates(text, now);
  if (!BOOKING_VERB_RE.test(text) && dates.length === 0) return null;
  const checkIn = dates[0] || null;
  let checkOut = dates[1] || null;
  if (checkIn && checkOut && checkOut <= checkIn) checkOut = null;
  return { checkIn, checkOut, adults: extractAdults(text), city: extractCity(text) };
}
