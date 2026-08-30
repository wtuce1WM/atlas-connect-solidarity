// ============================================================================
// Pont déterministe « badge vidéo → établissements » (zéro token, zéro LLM).
//
// Un badge (ex. « Complexes hôteliers ») est majoritairement porté par les
// VIDÉOS (internes `business_documents`, YouTube `business_youtube_videos`)
// et pas par les fiches (`business_badges`). Toute route curatée ou lexicale
// qui cible un badge doit donc croiser les 3 sources pour ne pas amputer le
// corpus. Les vidéos génériques (`generic_video_businesses`) sont exclues :
// ce rattachement sert au feed vidéo, pas à qualifier l'établissement.
//
// Même mécanisme que `src/lib/getVideoPinIds.ts` côté front — porté ici pour
// être partagé par les 3 surfaces IA (embed / club / search).
// ============================================================================

function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Dé-pluralise grossièrement (exporté : sert aux comparaisons badge ↔ cible résolue). */
export function badgeLabelKey(v: string): string {
  return depluralize(v);
}

/** Dé-pluralise grossièrement chaque mot (« complexes hôteliers » ⇢ « complexe hotelier »). */
function depluralize(v: string): string {
  return norm(v)
    .split(" ")
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ");
}

/** Libellés trop ambigus pour servir de détecteur de badge (mots grammaticaux). */
const AMBIGUOUS_BADGE_TOKENS = new Set(["the", "and", "or", "les", "des", "una", "uno", "tea"]);

export type FrontBadge = { id: string; name: string };

/**
 * Le message nomme-t-il littéralement un badge actif sur le front ?
 * Retourne le badge dont le libellé (FR/EN/AR) est le plus long trouvé dans le
 * message — le plus spécifique gagne. Aucun appel modèle.
 */
export async function matchFrontBadgeInMessage(
  admin: any,
  message: string,
  lang: "fr" | "en" | "ar" = "fr",
): Promise<FrontBadge | null> {
  const hay = ` ${norm(message)} `;
  const hayDep = ` ${depluralize(message)} `;
  if (!hay.trim()) return null;
  const { data } = await admin
    .from("badges")
    .select("id, name_fr, name_en, name_ar")
    .eq("is_active_on_front", true);
  let best: { id: string; name: string; len: number } | null = null;
  for (const b of (data || []) as any[]) {
    const label =
      (lang === "en" && b.name_en) || (lang === "ar" && b.name_ar) || b.name_fr || b.name_en || b.name_ar;
    for (const raw of [b.name_fr, b.name_en, b.name_ar]) {
      const n = norm(raw);
      // Seuil abaissé de 5 à 3 caractères : 19 badges actifs courts (Vélo, Spa,
      // Bar, Golf, Moto, Quad, Souk, Yoga, Musée…) étaient invisibles au texte
      // comme au vocal. La comparaison est déjà faite sur MOT ENTIER (` velo `),
      // donc pas de faux positif par sous-chaîne. Denylist : libellés qui sont
      // aussi des mots grammaticaux courants (« Thé » ⇢ « the » anglais).
      if (!n || n.length < 3 || AMBIGUOUS_BADGE_TOKENS.has(n)) continue;
      const nd = depluralize(raw as string);
      const hit = hay.includes(` ${n} `) || hayDep.includes(` ${nd} `);
      if (!hit) continue;
      if (!best || n.length > best.len) best = { id: String(b.id), name: String(label || raw), len: n.length };
    }
  }
  return best ? { id: best.id, name: best.name } : null;
}

/**
 * TOUS les badges actifs littéralement nommés dans le message, du plus
 * spécifique au moins spécifique. Sert à l'AUGMENTATION du corpus (où plusieurs
 * badges peuvent coexister : « location de vélo » ⇢ `Location` + `Vélo`), là où
 * `matchFrontBadgeInMessage` ne garde que le plus long parce qu'il fait AUTORITÉ
 * sur le corpus entier.
 */
export async function matchFrontBadgesInMessage(
  admin: any,
  message: string,
  lang: "fr" | "en" | "ar" = "fr",
  max = 3,
): Promise<FrontBadge[]> {
  const hay = ` ${norm(message)} `;
  const hayDep = ` ${depluralize(message)} `;
  if (!hay.trim()) return [];
  const { data } = await admin
    .from("badges")
    .select("id, name_fr, name_en, name_ar")
    .eq("is_active_on_front", true);
  const hits: Array<{ id: string; name: string; len: number }> = [];
  for (const b of (data || []) as any[]) {
    const label =
      (lang === "en" && b.name_en) || (lang === "ar" && b.name_ar) || b.name_fr || b.name_en || b.name_ar;
    let bestLen = 0;
    for (const raw of [b.name_fr, b.name_en, b.name_ar]) {
      const n = norm(raw);
      if (!n || n.length < 3 || AMBIGUOUS_BADGE_TOKENS.has(n)) continue;
      const nd = depluralize(raw as string);
      if (!(hay.includes(` ${n} `) || hayDep.includes(` ${nd} `))) continue;
      if (n.length > bestLen) bestLen = n.length;
    }
    if (bestLen) hits.push({ id: String(b.id), name: String(label || b.name_fr), len: bestLen });
  }
  return hits.sort((a, c) => c.len - a.len).slice(0, max).map(({ id, name }) => ({ id, name }));
}

/**
 * Tous les établissements ACTIFS liés à un (ou plusieurs) badge(s), via :
 *   1) `business_badges` (badge posé sur la fiche) ;
 *   2) vidéos internes badgées (`business_document_badges`) ;
 *   3) shorts YouTube badgés (`business_youtube_video_badges`).
 *
 * La source 3 (YouTube) est conditionnée au flag `badges.qualify_business_from_youtube`
 * (désactivé par défaut) : un short qui PARLE d'un sujet ne qualifie pas l'offre.
 *
 * Les vidéos GÉNÉRIQUES badgées (`generic_video_businesses`) sont EXCLUES :
 * leur rattachement sert à la distribution du feed vidéo, pas à qualifier
 * l'établissement — une vidéo générique badgée (ex. « Rooftop ») est
 * rattachée à des dizaines de business et polluait les réponses IA.
 *
 * Ordre : mis en avant, puis note, puis volume d'avis. Filtre ville si fournie.
 */
export async function resolveBadgeBusinessIds(
  admin: any,
  badgeIds: string[],
  city?: string | null,
  limit = 60,
): Promise<string[]> {
  const ids = (badgeIds || []).filter(Boolean);
  if (!ids.length) return [];

  // Interrupteur par badge : les shorts YouTube ne qualifient un établissement
  // QUE si `badges.qualify_business_from_youtube` est activé en backoffice.
  const { data: flagRows } = await admin
    .from("badges")
    .select("id")
    .in("id", ids)
    .eq("qualify_business_from_youtube", true);
  const ytBadgeIds = (flagRows || []).map((r: any) => String(r.id));

  const [fiche, docs, yts] = await Promise.all([
    admin.from("business_badges").select("business_id").in("badge_id", ids).limit(3000),
    admin.from("business_document_badges").select("document_id").in("badge_id", ids).limit(5000),
    ytBadgeIds.length
      ? admin.from("business_youtube_video_badges").select("youtube_video_id").in("badge_id", ytBadgeIds).limit(5000)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const docIds = [...new Set((docs?.data || []).map((r: any) => String(r.document_id)))];
  const ytIds = [...new Set((yts?.data || []).map((r: any) => String(r.youtube_video_id)))];

  /**
   * Résolution vidéo → établissement PAR LOTS. Un badge très filmé porte des
   * centaines de vidéos : un `.in("id", [400 uuid])` dépassait la longueur d'URL
   * acceptée par l'API, l'erreur était avalée silencieusement et le pont vidéo
   * renvoyait 0 — le corpus curaté retombait aux seuls badges de fiche
   * (ex. « Rooftop » Essaouira : 2 au lieu de 22).
   */
  const CHUNK = 80;
  const chunked = async (
    table: string,
    idList: string[],
    apply: (q: any) => any,
  ): Promise<any[]> => {
    const out: any[] = [];
    for (let i = 0; i < idList.length; i += CHUNK) {
      const slice = idList.slice(i, i + CHUNK);
      const { data, error } = await apply(admin.from(table).select("business_id").in("id", slice));
      if (error) {
        console.error(`[badge-video] ${table}_chunk_failed`, error.message);
        continue;
      }
      out.push(...(data || []));
    }
    return out;
  };

  const [docRows, ytRows] = await Promise.all([
    docIds.length
      ? chunked("business_documents", docIds, (q: any) => q.eq("type", "video").eq("business_is_active", true))
      : Promise.resolve([] as any[]),
    ytIds.length
      ? chunked("business_youtube_videos", ytIds, (q: any) => q.eq("business_is_active", true))
      : Promise.resolve([] as any[]),
  ]);


  const pool = [
    ...(fiche?.data || []),
    ...docRows,
    ...ytRows,
  ]

    .map((r: any) => r?.business_id)
    .filter(Boolean)
    .map(String);
  const unique = [...new Set(pool)];
  if (!unique.length) return [];

  // Même précaution de longueur d'URL : le pool d'établissements est lu par lots,
  // puis trié en mémoire (mis en avant → note → volume d'avis) avant la coupe.
  const c = String(city || "").trim();
  const rows: any[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    let q = admin
      .from("businesses")
      .select("id, is_featured, computed_rating, total_review_count")
      .in("id", unique.slice(i, i + CHUNK))
      .eq("is_active", true)
      .is("closure_message", null);
    if (c) q = q.eq("city", c);
    const { data, error } = await q;
    if (error) {
      console.error("[badge-video] businesses_chunk_failed", error.message);
      continue;
    }
    rows.push(...(data || []));
  }
  rows.sort((a, b) =>
    Number(!!b.is_featured) - Number(!!a.is_featured) ||
    Number(b.computed_rating ?? -1) - Number(a.computed_rating ?? -1) ||
    Number(b.total_review_count ?? -1) - Number(a.total_review_count ?? -1)
  );
  return rows.slice(0, limit).map((b: any) => String(b.id));

}
