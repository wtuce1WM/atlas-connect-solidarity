/**
 * Périmètre géographique DESTINATION (zéro token).
 *
 * Le périmètre par défaut du moteur est une VILLE (`city-scope.ts`). Or une part
 * du contenu 1WM n'est pas rattachée à une ville : « l'Atlas », « la Vallée de
 * l'Ourika », « Imlil », « le désert d'Agafay ». Quand l'utilisateur nomme une
 * de ces destinations, le filtre ville l'élimine intégralement.
 *
 * Règle : une destination nommée explicitement REMPLACE le périmètre ville, et
 * l'appartenance vient de la table de liaison `business_destinations` (curée),
 * jamais d'un rayon deviné. Les destinations qui portent le nom d'une ville
 * (Marrakech, Essaouira, Fès…) sont ignorées ici : elles restent du ressort de
 * `city-scope.ts`.
 */

import { CTA_SELECT_FIELDS } from "./routes/shared.ts";

export interface DestinationScope {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  /** Libellé effectivement reconnu dans le message. */
  matched: string;
  /** Éditorial back-office (accroche), localisé. */
  hook?: string | null;
  /** Éditorial back-office (description), localisé. */
  description?: string | null;
}


const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim();

let cache: { at: number; dests: any[]; cityNames: Set<string> } | null = null;

async function loadVocabulary(admin: any) {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache;
  const [{ data: dests }, { data: cities }] = await Promise.all([
    admin
      .from("destinations")
      .select("id, name_fr, name_en, name_ar, keywords, latitude, longitude")
      .eq("is_searchable", true),
    admin.from("cities").select("name_fr, name_en, name_ar"),
  ]);
  const cityNames = new Set<string>();
  for (const c of (cities as any[]) || []) {
    for (const n of [c?.name_fr, c?.name_en, c?.name_ar]) {
      const nn = norm(n);
      if (nn) cityNames.add(nn);
    }
  }
  cache = { at: Date.now(), dests: (dests as any[]) || [], cityNames };
  return cache;
}

/**
 * Détecte une destination explicitement nommée dans le message.
 * Vocabulaire = noms FR/EN/AR + `keywords` (alias pilotés en back-office :
 * c'est là qu'on rattache « atlas » à « Montagnes de l'Atlas »).
 * Libellé le plus long d'abord (« Médina de Marrakech » avant « Médina »),
 * correspondance sur mots entiers, villes exclues.
 */
export async function detectExplicitDestination(
  admin: any,
  text: string,
): Promise<DestinationScope | null> {
  const haystack = ` ${norm(text)} `;
  if (haystack.trim().length < 3) return null;
  try {
    const { dests, cityNames } = await loadVocabulary(admin);
    const entries: Array<{ row: any; label: string; nn: string }> = [];
    for (const row of dests) {
      const labels = [
        row?.name_fr, row?.name_en, row?.name_ar,
        ...(Array.isArray(row?.keywords) ? row.keywords : []),
      ];
      for (const label of labels) {
        const nn = norm(label);
        if (nn.length < 4 || cityNames.has(nn)) continue;
        entries.push({ row, label: String(label), nn });
      }
    }
    entries.sort((a, b) => b.nn.length - a.nn.length);
    for (const e of entries) {
      if (haystack.includes(` ${e.nn} `)) {
        return {
          id: String(e.row.id),
          name: String(e.row.name_fr || e.label),
          latitude: Number.isFinite(Number(e.row.latitude)) ? Number(e.row.latitude) : null,
          longitude: Number.isFinite(Number(e.row.longitude)) ? Number(e.row.longitude) : null,
          matched: e.label,
        };
      }
    }
  } catch (err) {
    console.warn("[ai-engine/destination-scope] detect failed", String(err));
  }
  return null;

}

/**
 * Périmètre destination imposé par un CHIP déterministe (`destinationId` du
 * client) : aucune NLP, aucune ambiguïté — l'identifiant vient de la base.
 */
export async function fetchDestinationById(
  admin: any,
  id: string,
  lang: string = "fr",
): Promise<DestinationScope | null> {
  if (!id) return null;
  const { data } = await admin
    .from("destinations")
    .select("id, name_fr, name_en, name_ar, latitude, longitude")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const name =
    (lang === "en" ? data.name_en : lang === "ar" ? data.name_ar : data.name_fr) || data.name_fr;
  return {
    id: String(data.id),
    name: String(name || ""),
    latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    matched: String(name || ""),
  };
}

export interface ScopeChip {
  id: string;
  name: string;
  count: number;
}

/**
 * Chips de périmètre déterministes : destinations réellement représentées dans
 * le corpus du tour (table `business_destinations`). Elles remplacent les
 * propositions en texte libre du modèle (« à Marrakech ou dans l'Atlas ? ») :
 * le client renvoie un `destination_id`, jamais une chaîne à re-interpréter.
 */
export async function destinationChipsForBusinesses(
  admin: any,
  businessIds: string[],
  lang: string = "fr",
  excludeId?: string | null,
): Promise<ScopeChip[]> {
  const ids = [...new Set((businessIds || []).map(String).filter(Boolean))];
  if (ids.length < 2) return [];
  try {
    const { data: links } = await admin
      .from("business_destinations")
      .select("destination_id, business_id")
      .in("business_id", ids.slice(0, 200));
    const counts = new Map<string, number>();
    for (const l of ((links as any[]) || [])) {
      const d = String(l.destination_id);
      if (excludeId && d === excludeId) continue;
      counts.set(d, (counts.get(d) || 0) + 1);
    }
    if (!counts.size) return [];
    const { data: dests } = await admin
      .from("destinations")
      .select("id, name_fr, name_en, name_ar")
      .in("id", [...counts.keys()])
      .eq("is_searchable", true);
    const chips: ScopeChip[] = ((dests as any[]) || []).map((d) => ({
      id: String(d.id),
      name: String(
        (lang === "en" ? d.name_en : lang === "ar" ? d.name_ar : d.name_fr) || d.name_fr || "",
      ),
      count: counts.get(String(d.id)) || 0,
    })).filter((c) => c.name);
    chips.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return chips.slice(0, 6);
  } catch (err) {
    console.warn("[ai-engine/destination-scope] chips failed", String(err));
    return [];
  }
}

export function destinationChipsMarker(chips: ScopeChip[]) {
  const safe = JSON.stringify({ chips }).replace(/-->/g, "--&gt;");
  return `<!--DESTINATION_CHIPS:${safe}-->`;
}

const CARD_FIELDS =
  "id, name, slug, city, neighborhood, address, main_category, categories, services, keywords, " +
  "latitude, longitude, logo_url, images, computed_rating, rating, total_review_count, " +
  "google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements, " +
  "opening_hours, is_open_24h, vacation_dates, show_opening_hours, priority_score, " +
  "hook_fr, hook_en, hook_ar, " + CTA_SELECT_FIELDS;

/** Établissements curés sur la destination, triés par priorité puis note. */
export async function fetchDestinationBusinesses(
  admin: any,
  destinationId: string,
): Promise<any[]> {
  const { data: links } = await admin
    .from("business_destinations")
    .select("business_id")
    .eq("destination_id", destinationId);
  const ids = [...new Set(((links as any[]) || []).map((l) => String(l.business_id)).filter(Boolean))];
  if (!ids.length) return [];

  const rows: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("businesses")
      .select(CARD_FIELDS)
      .in("id", ids.slice(i, i + 200))
      .eq("is_active", true);
    if (Array.isArray(data)) rows.push(...data);
  }
  rows.sort(
    (a, b) =>
      Number(b?.priority_score ?? 0) - Number(a?.priority_score ?? 0) ||
      Number(b?.computed_rating ?? b?.rating ?? 0) - Number(a?.computed_rating ?? a?.rating ?? 0),
  );
  return rows;
}

/**
 * Affinage taxonomique DANS la destination : les termes résolus (catégorie,
 * sous-catégorie, service) filtrent le corpus. Aucun repli silencieux inversé :
 * si le filtre vide tout, on rend le corpus complet de la destination — le
 * périmètre géo reste la promesse tenue.
 */
export function filterDestinationPool(pool: any[], terms: string[]): any[] {
  const wanted = terms.map(norm).filter((t) => t.length > 2);
  if (!wanted.length) return pool;
  const kept = pool.filter((b) => {
    const hay = norm(
      [
        b?.main_category,
        ...(Array.isArray(b?.categories) ? b.categories : []),
        ...(Array.isArray(b?.services) ? b.services : []),
        ...(Array.isArray(b?.keywords) ? b.keywords : []),
      ].join(" "),
    );
    return wanted.some((t) => hay.includes(t));
  });
  return kept.length ? kept : pool;
}
