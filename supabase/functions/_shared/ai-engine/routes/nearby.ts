// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, haversineKmLocal, toMapMarker, fmtKm, FS_EMOJI, FS_I18N } from "./shared.ts";

export function isNearbyOverviewIntent(text: string, hostName?: string): boolean {
  const q = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!q) return false;
  if (/que faire.*(proximite|autour)/.test(q)) return true;
  if (/what to do.*(nearby|around|near me)/.test(q)) return true;
  if (/ما(ذا)?.*(قرب|حول)/.test(q)) return true;
  // Generic "à proximité de / près de / autour de / near / around / close to <lieu>"
  if (/\b(a\s+proximite\s+de|pres\s+de|proche\s+de|autour\s+de|a\s+cote\s+de|aux\s+alentours\s+de|near|around|close\s+to|next\s+to)\b/.test(q)) return true;
  if (hostName) {
    const hn = normalize(hostName);
    if (hn && q.includes(hn)) {
      // "à proximité", "autour", "nearby" mentioned near host name
      if (/(proximite|autour|pres|nearby|around|close|near)/.test(q)) return true;
    }
  }
  return false;
}

export function isProximityIntent(text: string): boolean {
  const q = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!q) return false;
  if (/\b(a\s+proximite|proximite|pres\s+de|proche\s+de|autour\s+de|autour|a\s+cote\s+de|aux\s+alentours|nearby|near\s+me|near\s+by|close\s+to|around|next\s+to|walking\s+distance)\b/.test(q)) return true;
  if (/(قرب|بالقرب|حول|بجوار|بجانب)/.test(text || "")) return true;
  // An explicit inline radius ("500 m", "à moins de 1 km", "within 2 km") implies
  // a proximity refinement on the current thread.
  if (parseInlineRadiusKm(text) != null) return true;
  return false;
}

export function isSuggestionRefinement(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return true;
  if (isProximityIntent(raw)) return true;
  if (parseInlineRadiusKm(raw) != null) return true;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return true;
  return false;
}

export function parseInlineRadiusKm(text: string): number | null {
  const raw = String(text ?? "");
  if (!raw.trim()) return null;
  const q = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // km first (avoids "m" of "km" being caught as metres)
  const km = q.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilom[eè]tres?|kilomet(?:er|re)s?|كم|كيلومتر)\b/);
  if (km) {
    const v = Number(km[1].replace(",", "."));
    if (Number.isFinite(v) && v > 0 && v <= 50) return v;
  }
  const m = q.match(/(\d{2,4})\s*(?:m|metres?|meters?|م)\b/);
  if (m) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v >= 50 && v <= 20000) return v / 1000;
  }
  return null;
}

export type TwoEntityIntent = {
  aTerms: string[];
  bTerm: string;
  radiusKm?: number;
};

export async function fetchEntityPoolFromCurated(
  admin: any,
  city: string,
  side: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] },
  excludeId?: string,
): Promise<any[]> {
  const cols = "id, slug, name, city, neighborhood, hook_fr, hook_en, hook_ar, description, description_en, description_ar, latitude, longitude, main_category, categories, services, badge_id, images, logo_url, priority_score, computed_rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count";
  const base = () => {
    let q = admin
      .from("businesses")
      .select(cols)
      .eq("is_active", true)
      .is("closure_message", null)
      .eq("city", city)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(200);
    if (excludeId) q = q.neq("id", excludeId);
    return q;
  };
  const runs: Promise<{ data: any[] | null }>[] = [];
  if (side.subcatNames.length) {
    runs.push(base().overlaps("categories", side.subcatNames));
    runs.push(base().in("main_category", side.subcatNames));
  }
  if (side.badgeIds.length) {
    runs.push(base().in("badge_id", side.badgeIds));
  }
  const out = new Map<string, any>();
  if (runs.length) {
    const results = await Promise.all(runs);
    for (const r of results) for (const b of r.data || []) if (b?.id) out.set(b.id, b);
  }
  return [...out.values()];
}

export async function buildTwoEntityProximityCurated(
  admin: any,
  host: any,
  intent: TwoEntityIntent,
  lang: "fr" | "en" | "ar",
  strictRadius: boolean,
  curated: {
    a: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
    b: { subcatIds: string[]; badgeIds: string[]; subcatNames: string[] };
  },
): Promise<{ text: string; results: any[]; radiusUsed: number; radiusExpanded: boolean; bTerm: string; aTerms: string[] } | null> {
  const city = host.city || "Marrakech";
  const [poolA, poolB] = await Promise.all([
    fetchEntityPoolFromCurated(admin, city, curated.a, host?.id),
    fetchEntityPoolFromCurated(admin, city, curated.b, host?.id),
  ]);
  if (!poolA.length || !poolB.length) return null;

  const initial = intent.radiusKm ?? 1;
  const ladder = strictRadius ? [initial] : [initial, Math.max(initial, 2), Math.max(initial, 3)];
  let kept: any[] = [];
  let radiusUsed = initial;
  for (const r of ladder) {
    kept = poolA
      .map((a) => {
        let bestKm = Infinity;
        let bestB: any = null;
        for (const b of poolB) {
          if (b.id === a.id) continue;
          if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
          const d = haversineKmLocal(a.latitude, a.longitude, b.latitude, b.longitude);
          if (d < bestKm) { bestKm = d; bestB = b; }
        }
        return bestKm <= r ? { ...a, _nearest_b_km: bestKm, _nearest_b_name: bestB?.name || null } : null;
      })
      .filter(Boolean) as any[];
    if (kept.length) { radiusUsed = r; break; }
  }
  if (!kept.length) return null;

  kept.sort((x, y) => (Number(y.priority_score ?? 0) - Number(x.priority_score ?? 0)) || (Number(y.computed_rating ?? 0) - Number(x.computed_rating ?? 0)));
  const top = kept.slice(0, 12);

  // Collect the B references actually used (nearest B for each kept A within radius).
  const usedBIds = new Set<string>();
  const bReferences: any[] = [];
  for (const a of top) {
    let bestKm = Infinity;
    let bestB: any = null;
    for (const b of poolB) {
      if (b.id === a.id) continue;
      if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
      const d = haversineKmLocal(a.latitude, a.longitude, b.latitude, b.longitude);
      if (d < bestKm) { bestKm = d; bestB = b; }
    }
    if (bestB && !usedBIds.has(bestB.id)) {
      usedBIds.add(bestB.id);
      bReferences.push({ ...bestB, _is_reference: true });
    }
  }

  const radiusExpanded = radiusUsed > (intent.radiusKm ?? 1);
  const fmt = (r: number) => (r < 1 ? `${Math.round(r * 1000)} m` : Number.isInteger(r) ? `${r} km` : `${r.toFixed(1)} km`);
  const aLabel = intent.aTerms[0] || (lang === "en" ? "matching places" : lang === "ar" ? "الأماكن المطابقة" : "les adresses");
  const bLabel = intent.bTerm || (lang === "en" ? "reference" : lang === "ar" ? "المرجع" : "référence");

  const intro = lang === "en"
    ? `Curated cross-search in ${city} — I kept only places matching the selection with at least one reference within **${fmt(radiusUsed)}**. Here is the short list, One World Morocco selection only.`
    : lang === "ar"
      ? `تقاطع مُنسَّق في ${city} — احتفظت فقط بالأماكن التي تطابق الاختيار مع مرجع ضمن **${fmt(radiusUsed)}**. هذه القائمة المختصرة، من اختيار One World Morocco.`
      : `Croisement curé à ${city} — je n'ai gardé que les adresses correspondant à la sélection avec au moins une référence à moins de **${fmt(radiusUsed)}**. Voici la sélection courte, uniquement des adresses One World Morocco.`;

  const body = top.map((b) => {
    const hook = String(
      lang === "en" ? (b.hook_en || b.hook_fr || b.description_en || b.description || "") :
      lang === "ar" ? (b.hook_ar || b.hook_fr || b.description_ar || b.description || "") :
                      (b.hook_fr || b.hook_en || b.description || b.description_en || "")
    ).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const area = [b.neighborhood, b.city].filter(Boolean).join(lang === "ar" ? "، " : ", ");
    const km = Number(b._nearest_b_km);
    const distStr = Number.isFinite(km) ? fmt(km) : null;
    const nearestLabel = b._nearest_b_name
      ? (lang === "en" ? ` — closest reference: **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}` :
         lang === "ar" ? ` — أقرب مرجع: **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}` :
                         ` — référence la plus proche : **${b._nearest_b_name}**${distStr ? ` (${distStr})` : ""}`)
      : "";
    const detail = hook || (Array.isArray(b.categories) ? b.categories.join(", ") : b.main_category || "");
    return `**${b.name}**${area ? `, ${area}` : ""}. ${detail}${nearestLabel}`;
  }).join("\n\n");

  const expansionNote = radiusExpanded
    ? (lang === "en" ? `\n\n> Not enough matches within ${fmt(intent.radiusKm ?? 1)} — expanded to **${fmt(radiusUsed)}**.`
      : lang === "ar" ? `\n\n> لا توجد نتائج كافية ضمن ${fmt(intent.radiusKm ?? 1)} — تم التوسيع إلى **${fmt(radiusUsed)}**.`
      : `\n\n> Pas assez de résultats à ${fmt(intent.radiusKm ?? 1)} — périmètre élargi à **${fmt(radiusUsed)}**.`)
    : "";

  const closing = lang === "en"
    ? `\n\nWant me to **narrow to ${fmt(Math.max(0.5, radiusUsed / 2))}** or **widen to ${fmt(radiusUsed * 2)}** — or filter by vibe or neighborhood?`
    : lang === "ar"
      ? `\n\nهل تريد **تضييق النطاق إلى ${fmt(Math.max(0.5, radiusUsed / 2))}** أو **توسيعه إلى ${fmt(radiusUsed * 2)}** — أو تصفية حسب الحي أو الأجواء؟`
      : `\n\nTu veux que je **resserre à ${fmt(Math.max(0.5, radiusUsed / 2))}** ou **élargisse à ${fmt(radiusUsed * 2)}** — ou que je filtre par quartier ou ambiance ?`;

  const text = `${intro}\n\n${body}${expansionNote}${closing}`;
  // Append B references (e.g. golfs) so they appear in the carousel + map markers.
  const combinedResults = [...top, ...bReferences];
  return { text, results: combinedResults, radiusUsed, radiusExpanded, bTerm: bLabel, aTerms: [aLabel] };
}

export async function buildNearbyOverview(
  admin: any,
  host: any,
  hostCategoryNames: Set<string>,
  lang: "fr" | "en" | "ar",
  radiusKm: number = 1,
): Promise<string> {
  if (host.latitude == null || host.longitude == null) return "";
  const RADIUS_KM = radiusKm > 0 ? radiusKm : 1;
  const dLat = RADIUS_KM / 111;
  const dLng = RADIUS_KM / (111 * Math.max(Math.cos((host.latitude * Math.PI) / 180), 0.1));
  const { data: biz } = await admin
    .from("businesses")
    .select("id, latitude, longitude, categories, main_category")
    .eq("is_active", true)
    .is("closure_message", null)
    .neq("id", host.id)
    .gte("latitude", host.latitude - dLat)
    .lte("latitude", host.latitude + dLat)
    .gte("longitude", host.longitude - dLng)
    .lte("longitude", host.longitude + dLng);
  const nearby = (biz || []).filter((b: any) =>
    b.latitude != null && b.longitude != null &&
    haversineKmLocal(host.latitude, host.longitude, b.latitude, b.longitude) <= RADIUS_KM,
  );
  if (!nearby.length) return "";

  const bizCategories = new Map<string, Set<string>>();
  for (const b of nearby) {
    const names = Array.isArray(b.categories) ? b.categories : [];
    const normalized = names.map(normalize).filter(Boolean);
    if (b.main_category) normalized.push(normalize(b.main_category));
    if (normalized.length) bizCategories.set(b.id, new Set(normalized));
  }

  const [fsRes, fssRes] = await Promise.all([
    admin.from("front_structure").select("id, name, sort_order").order("sort_order"),
    admin.from("front_structure_subcategories").select("front_structure_id, subcategory_id"),
  ]);
  const fsEntries: any[] = fsRes.data || [];
  const subIds = [...new Set((fssRes.data || []).map((l: any) => l.subcategory_id).filter(Boolean))];
  const { data: subRows } = subIds.length
    ? await admin.from("subcategories").select("id, name_fr").in("id", subIds)
    : { data: [] };
  const subNameById = new Map<string, string>();
  for (const s of subRows || []) {
    const n = normalize(s.name_fr);
    if (s.id && n) subNameById.set(s.id, n);
  }

  const fsSubs = new Map<string, Set<string>>();
  const excludedFsIds = new Set<string>();
  for (const fs of fsEntries) {
    if (fs?.id && hostCategoryNames.has(normalize(fs.name))) excludedFsIds.add(fs.id);
  }
  for (const l of fssRes.data || []) {
    if (!l.front_structure_id || !l.subcategory_id) continue;
    const subName = subNameById.get(l.subcategory_id);
    if (!subName) continue;
    if (hostCategoryNames.has(subName)) {
      excludedFsIds.add(l.front_structure_id);
      continue;
    }
    if (!fsSubs.has(l.front_structure_id)) fsSubs.set(l.front_structure_id, new Set());
    fsSubs.get(l.front_structure_id)!.add(subName);
  }

  const rows: Array<{ name: string; count: number }> = [];
  for (const fs of fsEntries) {
    if (excludedFsIds.has(fs.id)) continue;
    const sset = fsSubs.get(fs.id);
    if (!sset || !sset.size) continue;
    let count = 0;
    for (const cats of bizCategories.values()) {
      for (const c of cats) { if (sset.has(c)) { count++; break; } }
    }
    if (count > 0) rows.push({ name: fs.name, count });
  }
  rows.sort((a, b) => b.count - a.count);
  if (!rows.length) return "";

  const translate = (n: string) => lang === "fr" ? n : (FS_I18N[n]?.[lang] || n);
  const wordPlace = (n: number) => lang === "en" ? (n > 1 ? "places" : "place") : lang === "ar" ? "مكان" : (n > 1 ? "adresses" : "adresse");
  const radiusLabel = RADIUS_KM < 1 ? `${Math.round(RADIUS_KM * 1000)} m` : `${RADIUS_KM % 1 === 0 ? RADIUS_KM.toFixed(0) : RADIUS_KM} km`;

  const header = lang === "en"
    ? `I scanned **${nearby.length} active places** within **${radiusLabel}** of ${host.name}${host.city ? ` (${host.city})` : ""}, grouped by the One World Morocco taxonomy${hostCategoryNames.size ? ` (categories overlapping ${host.name}'s own offer are excluded)` : ""}:`
    : lang === "ar"
      ? `مررت على **${nearby.length} مكانًا نشطًا** ضمن **${radiusLabel}** من ${host.name}${host.city ? ` (${host.city})` : ""} وفق تصنيف One World Morocco${hostCategoryNames.size ? ` (تُستثنى الفئات التي تتداخل مع عرض ${host.name})` : ""}:`
      : `J'ai passé au crible **${nearby.length} adresses actives** à moins de **${radiusLabel}** de ${host.name}${host.city ? ` (${host.city})` : ""}, réparties dans la catégorisation One World Morocco${hostCategoryNames.size ? ` (les catégories qui recoupent l'offre de ${host.name} sont exclues)` : ""} :`;

  const bullets = rows
    .map((r) => `- ${FS_EMOJI[r.name] || "•"} **${translate(r.name)}** — ${r.count} ${wordPlace(r.count)}`)
    .join("\n");

  const footer = lang === "en"
    ? `\n\nSome places may appear in several categories. Tell me what you'd like — a table for dinner, a spa, a cultural walk, some shopping? — and I'll curate a shortlist.`
    : lang === "ar"
      ? `\n\nقد تظهر بعض الأماكن في أكثر من فئة. أخبرني بما تريد — عشاء، سبا، ثقافة، تسوق؟ — وسأقترح قائمة.`
      : `\n\nCertaines adresses peuvent relever de plusieurs catégories. Dis-moi ce qui te tente — une table pour dîner, un spa, une balade culturelle, du shopping ? — et je te propose une sélection ciblée.`;

  const radiusLine = lang === "en"
    ? `\n\n> Search radius: **${radiusLabel}** around ${host.name}. Want to **narrow it** or **expand it**?`
    : lang === "ar"
      ? `\n\n> نطاق البحث: **${radiusLabel}** حول ${host.name}. هل تريد **تضييقه** أو **توسيعه**؟`
      : `\n\n> Rayon de recherche : **${radiusLabel}** autour de ${host.name}. Tu veux le **resserrer** ou l'**étendre** ?`;

  return `${header}\n\n${bullets}${footer}${radiusLine}`;
}

export async function buildPoiNearby(
  admin: any,
  host: any,
  lang: "fr" | "en" | "ar",
  radiusKm: number = 1,
): Promise<string> {
  if (host.latitude == null || host.longitude == null) return "";
  const RADIUS_KM = radiusKm > 0 ? radiusKm : 1;
  const dLat = RADIUS_KM / 111;
  const dLng = RADIUS_KM / (111 * Math.max(Math.cos((host.latitude * Math.PI) / 180), 0.1));
  const stripHtml = (s: string) => String(s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Source de vérité : les POI RELIÉS à l'établissement en back-office
  // (`business_poi_businesses`), exactement comme l'overlay POI du slidepanel.
  // Repli géographique (is_poi dans le rayon) uniquement si aucun lien n'existe.
  const POI_COLS = "id, slug, name, hook_fr, hook_en, hook_ar, description, description_en, description_ar, latitude, longitude, city, neighborhood, address, main_category, logo_url, images, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements";

  const { data: poiLinks } = await admin
    .from("business_poi_businesses")
    .select("poi_business_id")
    .eq("business_id", host.id);
  const linkedIds: string[] = (poiLinks || [])
    .map((l: any) => l.poi_business_id)
    .filter((id: string) => id && id !== host.id);

  let pois: any[] | null = null;
  let linkedSource = false;
  if (linkedIds.length) {
    const { data: linked } = await admin
      .from("businesses")
      .select(POI_COLS)
      .in("id", linkedIds)
      .is("closure_message", null);
    if (linked?.length) { pois = linked; linkedSource = true; }
  }
  if (!pois) {
    const { data: boxed } = await admin
      .from("businesses")
      .select(POI_COLS)
      .eq("is_poi", true)
      .is("closure_message", null)
      .neq("id", host.id)
      .gte("latitude", host.latitude - dLat)
      .lte("latitude", host.latitude + dLat)
      .gte("longitude", host.longitude - dLng)
      .lte("longitude", host.longitude + dLng);
    pois = boxed || [];
  }

  const nearby = (pois || [])
    .filter((p: any) => p.latitude != null && p.longitude != null)
    .map((p: any) => ({
      ...p,
      distance_km: haversineKmLocal(host.latitude, host.longitude, p.latitude, p.longitude),
    }))
    // Les POI reliés à la main font loi : pas de coupe au rayon.
    .filter((p: any) => linkedSource || p.distance_km <= RADIUS_KM)
    .sort((a: any, b: any) => a.distance_km - b.distance_km);


  const radiusLabel = RADIUS_KM < 1 ? `${Math.round(RADIUS_KM * 1000)} m` : `${RADIUS_KM % 1 === 0 ? RADIUS_KM.toFixed(0) : RADIUS_KM} km`;

  if (!nearby.length) {
    return lang === "en"
      ? `I couldn't find any point of interest within **${radiusLabel}** of ${host.name}. Want me to widen the radius?`
      : lang === "ar"
        ? `لم أجد أي نقطة اهتمام ضمن **${radiusLabel}** من ${host.name}. هل توسّع النطاق؟`
        : `Je ne trouve aucun point d'intérêt dans un rayon de **${radiusLabel}** autour de ${host.name}. Tu veux que j'élargisse le rayon ?`;
  }

  const shownCount = Math.min(nearby.length, 20);
  const header = linkedSource
    ? (lang === "en"
      ? `Here are the **${shownCount} points of interest** linked to ${host.name}${host.city ? ` (${host.city})` : ""}, sorted by distance:`
      : lang === "ar"
        ? `إليك **${shownCount} نقاط اهتمام** مرتبطة بـ ${host.name}${host.city ? ` (${host.city})` : ""}، مرتبة حسب المسافة:`
        : `Voici les **${shownCount} points d'intérêt** associés à ${host.name}${host.city ? ` (${host.city})` : ""}, classés par distance :`)
    : (lang === "en"
      ? `Here are the **${nearby.length} points of interest** within **${radiusLabel}** of ${host.name}${host.city ? ` (${host.city})` : ""}, sorted by distance:`
      : lang === "ar"
        ? `إليك **${nearby.length} نقاط اهتمام** ضمن **${radiusLabel}** من ${host.name}${host.city ? ` (${host.city})` : ""}، مرتبة حسب المسافة:`
        : `Voici les **${nearby.length} points d'intérêt** dans un rayon de **${radiusLabel}** autour de ${host.name}${host.city ? ` (${host.city})` : ""}, classés par distance :`);


  const bullets = nearby.slice(0, 20).map((p: any) => {
    const rawDesc = (lang === "en" && p.hook_en) ? p.hook_en
      : (lang === "ar" && p.hook_ar) ? p.hook_ar
      : (p.hook_fr || (lang === "en" ? p.description_en : lang === "ar" ? p.description_ar : p.description) || "");
    const desc = stripHtml(rawDesc);
    const distLabel = p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)} m` : `${p.distance_km.toFixed(1)} km`;
    const short = desc ? ` — ${desc.slice(0, 180)}${desc.length > 180 ? "…" : ""}` : "";
    return `- 📍 **${p.name}** _(${distLabel})_${short}`;
  }).join("\n");

  const radiusLine = linkedSource
    ? ""
    : (lang === "en"
      ? `\n\n> Radius: **${radiusLabel}** around ${host.name}. Want to **narrow** or **expand** it?`
      : lang === "ar"
        ? `\n\n> النطاق: **${radiusLabel}** حول ${host.name}. هل تريد **تضييقه** أو **توسيعه**؟`
        : `\n\n> Rayon : **${radiusLabel}** autour de ${host.name}. Tu veux le **resserrer** ou l'**étendre** ?`);


  // Emit a SHOW_ON_MAP-compatible payload so the frontend renders the horizontal thumbnails carousel + "View on map".
  const mapBusinesses = nearby.slice(0, 20).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    neighborhood: p.neighborhood,
    address: p.address,
    main_category: p.main_category || "Point d'intérêt",
    categories: [p.main_category || "Point d'intérêt"],
    latitude: p.latitude,
    longitude: p.longitude,
    logo_url: p.logo_url,
    images: Array.isArray(p.images) ? p.images : [],
    google_rating: p.google_rating,
    google_review_count: p.google_review_count,
    tripadvisor_rating: p.tripadvisor_rating,
    tripadvisor_review_count: p.tripadvisor_review_count,
    engagements: p.engagements,
  }));
  const mapMarker = `\n\n<!--SHOW_ON_MAP:${JSON.stringify({ title: null, businesses: mapBusinesses })}-->`;

  return `${header}\n\n${bullets}${radiusLine}${mapMarker}`;
}

export function buildDisclosureFromCounts(shown: number, found: number, city: string): string {
  if (shown <= 0) return `📍 Aucun résultat trouvé à ${city} pour cette recherche — dis-moi si tu veux que je reformule ou que j'élargisse autour de ${city}.`;
  const hasMore = found > shown;
  const tail = hasMore
    ? `dis-moi si tu veux que je te **montre les autres** ou que j'affine par quartier, ambiance ou envie.`
    : `dis-moi si tu veux que j'affine par quartier, ambiance ou envie.`;
  return `📍 Je te présente ${shown} adresse${shown > 1 ? "s" : ""} sur ${found} trouvée${found > 1 ? "s" : ""} à ${city} — ${tail}`;
}

export function stripText(value: unknown): string {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
