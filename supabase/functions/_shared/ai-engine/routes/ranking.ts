// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, fetchPriorFull, fmtKm, toMapMarker, haversineKmLocal } from "./shared.ts";

export function isDistanceRankingIntent(text: string): "closest" | "farthest" | null {
  const n = normalize(text);
  if (!n) return null;
  if (/\b(le plus proche|la plus proche|les plus proches|plus pres|le plus pres)\b/.test(n)) return "closest";
  if (/\b(closest|nearest)\b/i.test(text)) return "closest";
  if (/(الأقرب|أقرب واحد)/.test(text)) return "closest";
  if (/\b(le plus loin|la plus loin|les plus loins|plus eloigne|le plus eloigne)\b/.test(n)) return "farthest";
  if (/\b(farthest|furthest)\b/i.test(text)) return "farthest";
  if (/(الأبعد)/.test(text)) return "farthest";
  return null;
}

export function isDistanceListIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(quelles?\s+sont\s+les\s+distances?|distances?\s+(depuis|par\s+rapport|de\s+chaque)|liste\s+des\s+distances?|donne[- ]?moi\s+les\s+distances?|a\s+quelle\s+distance)\b/.test(n)) return true;
  if (/\b(what\s+are\s+the\s+distances?|list\s+the\s+distances?|how\s+far\s+(is|are)\s+each|distances?\s+from)\b/i.test(text)) return true;
  if (/(ما\s+هي\s+المسافات|المسافات\s+من|كم\s+تبعد)/.test(text)) return true;
  return false;
}

export function isRatingRankingIntent(text: string): "best_rated" | "most_reviewed" | null {
  const n = normalize(text);
  if (!n) return null;
  if (/\b(le plus d['\s]?avis|le plus commente|les plus commentes|le plus populaire|les plus populaires)\b/.test(n)) return "most_reviewed";
  if (/\b(most reviews?|most reviewed|most popular)\b/i.test(text)) return "most_reviewed";
  if (/(الأكثر تقييما|الأكثر شعبية|الأكثر مراجعة)/.test(text)) return "most_reviewed";
  if (/\b(le mieux note|la mieux notee|le meilleur note|meilleure note|top note|le mieux classe)\b/.test(n)) return "best_rated";
  if (/\b(highest[- ]?rated|best[- ]?rated|top[- ]?rated)\b/i.test(text)) return "best_rated";
  if (/(الأعلى تقييما|الأفضل تقييما)/.test(text)) return "best_rated";
  return null;
}

export function parseOrdinalIntent(text: string, priorCount: number): number[] | null {
  if (priorCount <= 0) return null;
  const n = normalize(text);
  const firstK = /\b(?:les?\s+)?(\d+)\s+premiers?\b/.exec(n) || /\b(?:the\s+)?(?:first|top)\s+(\d+)\b/i.exec(text);
  if (firstK) {
    const k = Math.max(1, Math.min(priorCount, parseInt(firstK[1], 10)));
    return Array.from({ length: k }, (_, i) => i);
  }
  const lastK = /\b(?:les?\s+)?(\d+)\s+derniers?\b/.exec(n) || /\b(?:the\s+)?last\s+(\d+)\b/i.exec(text);
  if (lastK) {
    const k = Math.max(1, Math.min(priorCount, parseInt(lastK[1], 10)));
    return Array.from({ length: k }, (_, i) => priorCount - k + i);
  }
  if (/\b(le\s+premier|la\s+premiere|the\s+first|1er|1ere)\b/i.test(text)) return [0];
  if (/\b(le\s+dernier|la\s+derniere|the\s+last)\b/i.test(text)) return [priorCount - 1];
  const nth = /\ble\s+(\d+)(?:e|eme|er|ere)?\b/.exec(n) || /\b(?:the\s+)?(\d+)(?:st|nd|rd|th)\b/i.exec(text);
  if (nth) {
    const i = parseInt(nth[1], 10) - 1;
    if (i >= 0 && i < priorCount) return [i];
  }
  return null;
}

export function isCountIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(combien|combien y en a|combien il y en a|combien sont)\b/.test(n)) return true;
  if (/\bhow many\b/i.test(text)) return true;
  if (/(كم عدد|كم واحد|كم منها)/.test(text)) return true;
  return false;
}

export function extractPriorOrderedBusinesses(messages: any[], hostId: string): Array<{ id: string; slug?: string; name: string }> {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const content = String(m.content ?? "");
    const mapMatch = content.match(/<!--SHOW_ON_MAP:(\{[\s\S]*?\})-->/);
    if (mapMatch) {
      try {
        const parsed = JSON.parse(mapMatch[1]);
        if (parsed && Array.isArray(parsed.businesses)) {
          const arr = parsed.businesses.filter((b: any) => b?.id && b.id !== hostId).map((b: any) => ({ id: b.id, slug: b.slug, name: b.name }));
          if (arr.length) return arr;
        }
      } catch { /* ignore */ }
    }
    const knownMatch = content.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?\])-->/);
    if (knownMatch) {
      try {
        const arr = JSON.parse(knownMatch[1]);
        if (Array.isArray(arr) && arr.length) {
          return arr.filter((b: any) => b?.id && b.id !== hostId).map((b: any) => ({ id: b.id, slug: b.slug, name: b.name }));
        }
      } catch { /* ignore */ }
    }
  }
  return [];
}

export async function buildDistanceRanking(admin: any, host: any, ids: string[], mode: "closest" | "farthest", lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const hLat = Number(host.latitude), hLng = Number(host.longitude);
  if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) return null;
  const rows = await fetchPriorFull(admin, ids);
  const withDist = rows
    .filter((r: any) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r: any) => ({ ...r, _dist_km: haversineKmLocal(hLat, hLng, Number(r.latitude), Number(r.longitude)) }));
  if (!withDist.length) return null;
  withDist.sort((a: any, b: any) => (mode === "closest" ? a._dist_km - b._dist_km : b._dist_km - a._dist_km));
  const top = withDist.slice(0, 5);
  const lines = top.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${fmtKm(r._dist_km)}`;
  });
  const intro = mode === "closest"
    ? (lang === "en" ? `Among the previous results, **${top[0].name}** is the closest to **${host.name}**:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** هو الأقرب إلى **${host.name}**:`
      : `Parmi les précédents, c'est **${top[0].name}** le plus proche de **${host.name}** :`)
    : (lang === "en" ? `Among the previous results, **${top[0].name}** is the farthest from **${host.name}**:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** هو الأبعد عن **${host.name}**:`
      : `Parmi les précédents, c'est **${top[0].name}** le plus loin de **${host.name}** :`);
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
}

export async function buildDistanceList(admin: any, host: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const hLat = Number(host.latitude), hLng = Number(host.longitude);
  if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) return null;
  const rows = await fetchPriorFull(admin, ids);
  const withDist = rows
    .filter((r: any) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r: any) => ({ ...r, _dist_km: haversineKmLocal(hLat, hLng, Number(r.latitude), Number(r.longitude)) }));
  if (!withDist.length) return null;
  withDist.sort((a: any, b: any) => a._dist_km - b._dist_km);
  const lines = withDist.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${fmtKm(r._dist_km)}`;
  });
  const intro = lang === "en"
    ? `Distances from **${host.name}** for the previous results:`
    : lang === "ar"
      ? `المسافات من **${host.name}** للنتائج السابقة:`
      : `Distances depuis **${host.name}** pour les résultats précédents :`;
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(withDist)}`;
}

export async function buildRatingRanking(admin: any, ids: string[], mode: "best_rated" | "most_reviewed", lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const rows = await fetchPriorFull(admin, ids);
  if (!rows.length) return null;
  const scored = rows.map((r: any) => ({
    ...r,
    _rating: r.computed_rating != null ? Number(r.computed_rating) : (r.rating != null ? Number(r.rating) : null),
    _count: r.total_review_count != null ? Number(r.total_review_count) : 0,
  }));
  if (mode === "best_rated") {
    const eligible = scored.filter((r: any) => r._rating != null && r._count >= 10);
    if (!eligible.length) {
      if (lang === "en") return `I don't have enough public reviews on those results to rank them by rating. Want another angle?`;
      if (lang === "ar") return `لا توجد مراجعات كافية لتصنيف هذه النتائج حسب التقييم. زاوية أخرى؟`;
      return `Je n'ai pas assez d'avis publics sur ces adresses pour les classer par note. Un autre angle ?`;
    }
    eligible.sort((a: any, b: any) => (b._rating - a._rating) || (b._count - a._count));
    const top = eligible.slice(0, 5);
    const lines = top.map((r: any) => {
      const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ⭐ ${r._rating.toFixed(1)}/20 (${r._count} avis)`;
    });
    const intro = lang === "en" ? `Among the previous results, **${top[0].name}** has the highest overall rating:`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** لديه أعلى تقييم عام:`
      : `Parmi les précédents, c'est **${top[0].name}** qui a la meilleure note globale :`;
    return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
  }
  scored.sort((a: any, b: any) => b._count - a._count);
  const top = scored.filter((r: any) => r._count > 0).slice(0, 5);
  if (!top.length) {
    if (lang === "en") return `I don't have public review counts on those results.`;
    if (lang === "ar") return `لا توجد أعداد مراجعات علنية لهذه النتائج.`;
    return `Je n'ai pas de nombre d'avis publics sur ces adresses.`;
  }
  const lines = top.map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${r._count} avis`;
  });
  const intro = lang === "en" ? `Among the previous results, **${top[0].name}** has the most reviews:`
    : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** لديه أكبر عدد من المراجعات:`
    : `Parmi les précédents, c'est **${top[0].name}** qui a le plus d'avis :`;
  return `${intro}\n\n${lines.join("\n")}${toMapMarker(top)}`;
}

export function buildOrdinalPick(prior: Array<{ id: string; slug?: string; name: string }>, indices: number[], lang: "fr" | "en" | "ar"): string {
  const picks = indices.map((i) => prior[i]).filter(Boolean);
  if (!picks.length) {
    if (lang === "en") return `That position isn't in the previous list.`;
    if (lang === "ar") return `هذا الموقع ليس في القائمة السابقة.`;
    return `Cette position n'est pas dans la liste précédente.`;
  }
  const names = picks.map((p) => `**${p.name}**`).join(lang === "ar" ? "، " : ", ");
  if (picks.length === 1) {
    if (lang === "en") return `That's ${names} — want more detail, hours, or a booking link?`;
    if (lang === "ar") return `هذا ${names} — هل تريد تفاصيل، ساعات، أو رابط حجز؟`;
    return `C'est ${names} — tu veux plus de détails, les horaires, ou un lien de réservation ?`;
  }
  if (lang === "en") return `Those are ${names}. Want me to compare them?`;
  if (lang === "ar") return `هؤلاء هم ${names}. هل تريد المقارنة بينهم؟`;
  return `Ce sont ${names}. Je te les compare ?`;
}

export function buildCountAnswer(count: number, lang: "fr" | "en" | "ar"): string {
  if (count === 0) {
    if (lang === "en") return `There are no previous results to count.`;
    if (lang === "ar") return `لا توجد نتائج سابقة للعد.`;
    return `Il n'y a pas de résultats précédents à compter.`;
  }
  if (lang === "en") return `There ${count > 1 ? "are" : "is"} **${count}** result${count > 1 ? "s" : ""} in the previous selection. Want me to rank them or filter them?`;
  if (lang === "ar") return `يوجد **${count}** نتيجة في الاختيار السابق. هل تريد ترتيبها أو تصفيتها؟`;
  return `Il y a **${count}** résultat${count > 1 ? "s" : ""} dans la sélection précédente. Tu veux que je les classe ou les filtre ?`;
}
