// ---------------------------------------------------------------------------
// AFFINAGE DE PROXIMITÉ SUR LE POOL — « … à côté du golf », « près du port ».
//
// Le tour précédent a mémorisé un corpus (`poolIds`, ex. les villas d'Essaouira).
// La relance ne demande PAS une vue mais une DISTANCE à un repère. La plupart des
// fiches portent des coordonnées : la réponse doit donc donner les distances
// EXACTES au repère, classées, plutôt qu'un « proximité non précisée ».
//
// Repère résolu, dans l'ordre :
//   1) `points_of_interest` (nom FR/EN), priorité aux POI des villes du pool,
//   2) à défaut, un établissement actif géolocalisé dont le nom contient le terme.
//
// Aucun token IA : géométrie + base. Source unique partagée par le moteur v2.
// ---------------------------------------------------------------------------

import { distanceKm } from "./view-targets.ts";

const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Prépositions de proximité (sans intention de vue : « vue sur » est traité ailleurs). */
const PROX_RE =
  /\b(?:a\s+cote\s+(?:du|de\s+la|de\s+l|des|de)|pres\s+(?:du|de\s+la|de\s+l|des|de)|proche\s+(?:du|de\s+la|de\s+l|des|de)|a\s+proximite\s+(?:du|de\s+la|de\s+l|des|de)|autour\s+(?:du|de\s+la|de\s+l|des|de)|aux\s+alentours\s+(?:du|de\s+la|de\s+l|des|de)|next\s+to(?:\s+the)?|close\s+to(?:\s+the)?|near(?:\s+the)?|walking\s+distance\s+(?:from|to)(?:\s+the)?)\s+([^,.;!?]{2,60})/;

const TERM_STOP = new Set([
  "le", "la", "les", "l", "de", "des", "du", "d", "un", "une", "the", "a", "of",
  "svp", "please", "stp", "merci",
]);

export type ProximityIntent = { term: string } | null;

/**
 * « près de moi / autour de moi / near me » N'EST PAS un repère nommé : c'est
 * l'intention de géolocalisation, traitée par le flux geo (position réelle ou
 * repli Koutoubia). Sans cette exclusion, « moi » partait en recherche POI
 * `*moi*` et matchait « Patri-moi-ne » (Musée du Patrimoine Immatériel).
 */
const SELF_TERMS = new Set([
  "moi", "nous", "ici", "me", "us", "here", "my location", "ma position",
  "notre position", "mon emplacement", "chez moi",
]);

/**
 * « près de moi », « autour de moi », « near me » : proximité par rapport au
 * POINT de l'utilisateur (widget de géolocalisation), pas à un lieu nommé.
 */
export function detectSelfProximityIntent(rawText: string): boolean {
  const n = norm(rawText).replace(/\s+/g, " ");
  const m = PROX_RE.exec(n);
  if (m) {
    const term = m[1].split(" ").filter((t) => t && !TERM_STOP.has(t)).join(" ").trim();
    if (SELF_TERMS.has(term) || term.length < 3) return true;
  }
  return /\b(autour|pres|proche|a cote|a proximite)\s+d?\s?'?(ici)\b/.test(n)
    || /\bdans le coin\b/.test(n)
    || /\bnear me\b|\baround me\b|\bnearby\b/.test(n);
}

/** « je veux louer une villa à côté du golf » → { term: "golf" } */
export function detectPoolProximityIntent(rawText: string): ProximityIntent {
  const n = norm(rawText).replace(/\s+/g, " ");
  const m = PROX_RE.exec(n);
  if (!m) return null;
  const term = m[1]
    .split(" ")
    .filter((t) => t && !TERM_STOP.has(t))
    .join(" ")
    .trim();
  if (term.length < 3) return null;
  if (SELF_TERMS.has(term)) return null;
  return { term };
}

export type ProximityTarget = { name: string; lat: number; lng: number; source: "poi" | "business" };

/**
 * Résout le repère cité en un ou plusieurs points géolocalisés.
 * Priorité : POI de la/les ville(s) du pool → établissements dont la SOUS-CATÉGORIE
 * correspond au terme (ex. « golf ») dans ces villes → établissements dont le NOM
 * contient le terme. Jamais de repère hors des villes du pool : une villa de
 * Marrakech ne doit pas être mesurée par rapport au golf d'Essaouira.
 */
export async function resolveProximityTargets(
  admin: any,
  term: string,
  cityNames: string[],
): Promise<ProximityTarget[]> {
  const like = `*${term.replace(/[,()*]/g, " ").trim()}*`;
  const out: ProximityTarget[] = [];
  const nTerm = norm(term);

  const cityIds = new Set<string>();
  if (cityNames.length) {
    const { data: cities } = await admin
      .from("cities").select("id, name_fr").in("name_fr", cityNames);
    for (const c of cities || []) cityIds.add(String((c as any).id));
  }

  const { data: pois } = await admin
    .from("points_of_interest")
    .select("name_fr, name_en, latitude, longitude, city_id")
    .or(`name_fr.ilike.${like},name_en.ilike.${like}`)
    .limit(50);
  const poiRows = (pois || []).filter(
    (p: any) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );
  // Restriction géographique stricte dès qu'on connaît les villes du pool.
  const chosen = cityIds.size
    ? poiRows.filter((p: any) => cityIds.has(String(p.city_id)))
    : poiRows;
  for (const p of chosen.slice(0, 8)) {
    out.push({ name: String(p.name_fr || p.name_en), lat: p.latitude, lng: p.longitude, source: "poi" });
  }
  if (out.length) return out;

  // Sous-catégorie réelle (businesses.categories) : seul moyen fiable de savoir
  // qu'un établissement EST un golf, un port, un hammam…
  let qSub = admin
    .from("businesses")
    .select("name, city, categories, latitude, longitude")
    .eq("is_active", true)
    .not("latitude", "is", null)
    .limit(200);
  if (cityNames.length) qSub = qSub.in("city", cityNames);
  const { data: subRows } = await qSub.overlaps("categories", [term]);
  const subMatches = (subRows || []).filter(
    (b: any) =>
      typeof b.latitude === "number" && typeof b.longitude === "number" &&
      (b.categories || []).some((c: string) => norm(c).includes(nTerm)),
  );
  if (!subMatches.length && cityNames.length) {
    // `overlaps` exige une égalité exacte : repli par balayage des villes du pool.
    let qAll = admin
      .from("businesses")
      .select("name, city, categories, latitude, longitude")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .in("city", cityNames)
      .limit(2000);
    const { data: allRows } = await qAll;
    for (const b of allRows || []) {
      if (typeof b.latitude !== "number" || typeof b.longitude !== "number") continue;
      if ((b.categories || []).some((c: string) => norm(c).includes(nTerm))) subMatches.push(b);
    }
  }
  for (const b of subMatches.slice(0, 15)) {
    out.push({ name: String(b.name), lat: b.latitude, lng: b.longitude, source: "business" });
  }
  if (out.length) return out;

  let q = admin
    .from("businesses")
    .select("name, city, latitude, longitude")
    .eq("is_active", true)
    .ilike("name", like)
    .not("latitude", "is", null)
    .limit(50);
  if (cityNames.length) q = q.in("city", cityNames);
  const { data: biz } = await q;
  for (const b of (biz || []).slice(0, 5)) {
    if (typeof b.latitude !== "number" || typeof b.longitude !== "number") continue;
    out.push({ name: String(b.name), lat: b.latitude, lng: b.longitude, source: "business" });
  }
  return out;
}


const fmtDist = (km: number) =>
  km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`;

export type PoolProximityResult = {
  orderedIds: string[];
  heading: string;
  targetName: string;
  withGps: number;
  withoutGps: number;
};

/**
 * Classe le pool par distance réelle au repère et construit l'en-tête factuel
 * (distances exactes, du plus proche au plus loin). Les fiches sans coordonnées
 * sont conservées en fin de liste et signalées, jamais estimées.
 */
export async function buildPoolProximityAnswer(
  admin: any,
  poolIds: string[],
  term: string,
  lang: "fr" | "en" | "ar",
  /**
   * Point de l'utilisateur (widget de géolocalisation ou repli Koutoubia). Quand
   * il est fourni, c'est LUI le repère : aucune résolution de lieu nommé, et le
   * moteur ne demande plus le quartier alors que la position est déjà connue.
   */
  selfAnchor?: { lat: number; lng: number; label?: string } | null,
): Promise<PoolProximityResult | null> {
  const rows: any[] = [];
  for (let i = 0; i < poolIds.length; i += 80) {
    const { data } = await admin
      .from("businesses")
      .select("id, name, city, neighborhood, latitude, longitude")
      .eq("is_active", true)
      .in("id", poolIds.slice(i, i + 80));
    rows.push(...(data || []));
  }
  if (!rows.length) return null;

  const cityNames = [...new Set(rows.map((b: any) => b.city).filter(Boolean).map(String))];
  const selfLabel = selfAnchor
    ? (selfAnchor.label || (lang === "en" ? "your location" : lang === "ar" ? "موقعك" : "votre position"))
    : null;
  const targets = selfAnchor
    ? [{ name: selfLabel as string, lat: selfAnchor.lat, lng: selfAnchor.lng, source: "poi" as const }]
    : await resolveProximityTargets(admin, term, cityNames);
  if (!targets.length) return null;

  const withDist = rows
    .map((b: any) => {
      if (typeof b.latitude !== "number" || typeof b.longitude !== "number") {
        return { b, km: null as number | null, near: null as string | null };
      }
      let best = targets[0];
      let km = distanceKm(best.lat, best.lng, b.latitude, b.longitude);
      for (const t of targets.slice(1)) {
        const d = distanceKm(t.lat, t.lng, b.latitude, b.longitude);
        if (d < km) { km = d; best = t; }
      }
      return { b, km, near: best.name };
    })
    .sort((x, y) => (x.km ?? Infinity) - (y.km ?? Infinity));

  const geo = withDist.filter((r) => r.km != null);
  if (!geo.length) return null;

  const multi = targets.length > 1;
  const targetName = selfAnchor ? (selfLabel as string) : multi ? term : targets[0].name;
  const intro = selfAnchor
    ? (lang === "en"
        ? `📐 Exact distances from **${targetName}**, closest first:`
        : lang === "ar"
          ? `📐 المسافات الدقيقة من **${targetName}**، من الأقرب إلى الأبعد:`
          : `📐 Distances exactes depuis **${targetName}**, du plus proche au plus loin :`)
    : lang === "en"
      ? `📐 Exact distances to the nearest **${targetName}**, closest first:`
      : lang === "ar"
        ? `📐 المسافات الدقيقة إلى أقرب **${targetName}**، من الأقرب إلى الأبعد:`
        : `📐 Distances exactes jusqu'au **${targetName}** le plus proche, du plus proche au plus loin :`;

  // RÈGLE UNIQUE DE RENDU : 4 adresses par lot, toujours accompagnées de leurs
  // cartes (miniatures). Le reste du corpus part dans le pool (« la suite »).
  const bullets = geo.slice(0, 4).map((r) => {
    const place = r.b.neighborhood || r.b.city || "";
    const near = multi && r.near ? ` → ${r.near}` : "";
    return `- **${r.b.name}**${place ? ` (${place})` : ""} — ${fmtDist(r.km as number)}${near}`;
  });


  const missing = withDist.length - geo.length;
  const note = missing
    ? (lang === "en"
        ? `\n\n_${missing} address(es) have no GPS coordinates: no distance can be computed._`
        : lang === "ar"
          ? `\n\n_${missing} عنوان بدون إحداثيات: لا يمكن حساب المسافة._`
          : `\n\n_${missing} adresse(s) sans coordonnées GPS : distance non calculable._`)
    : "";

  return {
    orderedIds: withDist.map((r) => String(r.b.id)),
    heading: `${intro}\n${bullets.join("\n")}${note}`,
    targetName,
    withGps: geo.length,
    withoutGps: missing,
  };
}
