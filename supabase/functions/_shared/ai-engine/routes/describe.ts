// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Route `describe` — facettes cuisine / ambiance / services sur les résultats précédents.
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, orderByIds, toMapMarker, haversineKmLocal, DAY_KEYS } from "./shared.ts";


/**
 * Deterministic: DESCRIBE PRIORS — "détaille / décris / quels types de cuisine / dis m'en plus…"
 * Operates on the previous turn's results. No LLM, no re-search.
 */
export function isDescribeIntent(text: string): boolean {
  const n = normalize(text || "");
  if (!n) return false;
  return /(^|\s)(detaille|detailles|detail|decris|decrire|explique|precise|presente|elaborate|describe|tell me more|dis m en plus|dis moi en plus|en dis plus|quels? types?|quelles? sortes?|quelles? cuisines?|quel style|quelle ambiance|quels services|specialite|specialites|types de|kind of|type of|what kind|what type)(\s|$)/.test(n);
}

export function parseDescribeFacet(text: string): "cuisine" | "ambiance" | "services" | null {
  const n = normalize(text || "");
  if (/cuisine|gastronom|plat|carte|menu|specialit|dish|food/.test(n)) return "cuisine";
  if (/service/.test(n)) return "services";
  if (/ambiance|style|deco|atmosph|vibe|mood/.test(n)) return "ambiance";
  return null;
}

export async function buildDescribePriors(
  admin: any,
  ids: string[],
  facet: "cuisine" | "ambiance" | "services" | null,
  lang: "fr" | "en" | "ar",
  host: any,
): Promise<string | null> {
  if (!ids.length) return null;
  const idsSlice = ids.slice(0, 20);
  const [bizRes, sumRes] = await Promise.all([
    admin.from("businesses").select(
      "id, name, slug, city, neighborhood, main_category, hook_fr, hook_en, hook_ar, description, description_en, description_ar, menu_url, menu_name, flipbook_url, flipbook_name, latitude, longitude, logo_url, images, computed_rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, opening_hours, show_opening_hours, is_open_24h, vacation_dates, default_service"
    ).in("id", idsSlice),
    admin.from("business_menu_summaries").select("business_id, title, content, price_details").in("business_id", idsSlice),
  ]);
  const data = bizRes?.data;
  if (!Array.isArray(data) || !data.length) return null;
  const ordered = orderByIds(data as any[], ids);
  const summariesByBiz = new Map<string, any[]>();
  (sumRes?.data || []).forEach((s: any) => {
    const arr = summariesByBiz.get(s.business_id) || [];
    arr.push(s);
    summariesByBiz.set(s.business_id, arr);
  });

  const pickHook = (r: any) => lang === "en" ? (r.hook_en || r.hook_fr) : lang === "ar" ? (r.hook_ar || r.hook_fr) : r.hook_fr;
  const pickDesc = (r: any) => lang === "en" ? (r.description_en || r.description) : lang === "ar" ? (r.description_ar || r.description) : r.description;
  const stripHtml = (s: string) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const firstSentences = (s: string, n = 2) => {
    const t = stripHtml(s);
    if (!t) return "";
    const parts = t.split(/(?<=[.!?…])\s+/).slice(0, n).join(" ").trim();
    return parts.length > 320 ? parts.slice(0, 317).trimEnd() + "…" : parts;
  };

  const menuLabel = lang === "en" ? "View menu" : lang === "ar" ? "عرض القائمة" : "Voir la carte";
  const flipbookLabel = lang === "en" ? "Browse flipbook" : lang === "ar" ? "تصفح الكتيب" : "Feuilleter le flipbook";

  // Morocco "now"
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const gp = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[gp("weekday")] ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const nowMin = parseInt(gp("hour"), 10) * 60 + parseInt(gp("minute"), 10);
  const todayStr = `${gp("year")}-${gp("month")}-${gp("day")}`;
  const toMin = (s: string): number | null => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; };
  const inSlot = (o?: string, c?: string): boolean => {
    const om = toMin(o || ""), cm = toMin(c || ""); if (om == null || cm == null) return false;
    const cAdj = cm <= om ? cm + 1440 : cm;
    return nowMin >= om && nowMin < cAdj;
  };

  const openLbl = lang === "en" ? "Open" : lang === "ar" ? "مفتوح" : "Ouvert";
  const closedLbl = lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  const open24Lbl = lang === "en" ? "Open 24/7" : lang === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";

  const computeOpen = (r: any): { badge: string; hours: string | null } => {
    if (r.is_open_24h) return { badge: `🟢 ${open24Lbl}`, hours: null };
    if (r.show_opening_hours !== true || !r.opening_hours) return { badge: "", hours: null };
    if (Array.isArray(r.vacation_dates)) {
      const onVac = r.vacation_dates.some((v: any) => v?.start_date && v?.end_date && todayStr >= v.start_date && todayStr <= v.end_date);
      if (onVac) return { badge: `🔴 ${closedLbl}`, hours: null };
    }
    const d = r.opening_hours?.[todayKey];
    if (!d || d.closed) return { badge: `🔴 ${closedLbl}`, hours: null };
    const isOpen = inSlot(d.open, d.close) || (!d.continuous && inSlot(d.open2, d.close2));
    const slot1 = d.open && d.close ? `${d.open}–${d.close}` : "";
    const slot2 = d.open2 && d.close2 && !d.continuous ? `${d.open2}–${d.close2}` : "";
    const hoursStr = [slot1, slot2].filter(Boolean).join(" / ") || null;
    return { badge: isOpen ? `🟢 ${openLbl}` : `🔴 ${closedLbl}`, hours: hoursStr };
  };

  const fmtDist = (km: number): string => {
    if (!isFinite(km)) return "";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const hLat = Number(host?.latitude), hLng = Number(host?.longitude);
  const hasHostCoords = isFinite(hLat) && isFinite(hLng);
  const hoursLbl = lang === "en" ? "Today" : lang === "ar" ? "اليوم" : "Aujourd'hui";
  const fromHostLbl = host?.name ? (lang === "en" ? `from ${host.name}` : lang === "ar" ? `من ${host.name}` : `de ${host.name}`) : "";

  const blocks = ordered.map((r: any, i: number) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    const hook = pickHook(r) || "";
    const desc = firstSentences(pickDesc(r), 2);
    const menuSums = summariesByBiz.get(r.id) || [];
    const menuExcerpt = menuSums.length
      ? firstSentences(menuSums.map((m: any) => `${m.title ? m.title + " : " : ""}${stripHtml(m.content || "")}`).join(" — "), 2)
      : "";

    // Immersive narrative
    const narrativeParts: string[] = [];
    if (hook) narrativeParts.push(hook);
    if (desc && !narrativeParts.some((p) => p.includes(desc.slice(0, 40)))) narrativeParts.push(desc);
    if (menuExcerpt) narrativeParts.push(menuExcerpt);
    const narrative = narrativeParts.join(" ");

    // Meta chips: open/closed · hours · rating · distance · default_service
    const chips: string[] = [];
    const oc = computeOpen(r);
    if (oc.badge) chips.push(oc.badge);
    if (oc.hours) chips.push(`🕒 ${hoursLbl} ${oc.hours}`);
    const rating = r.computed_rating != null ? Number(r.computed_rating) : null;
    const revCount = r.total_review_count != null ? Number(r.total_review_count) : null;
    if (rating != null && isFinite(rating)) {
      const ratingStr = (Math.round(rating * 10) / 10).toString().replace(".", lang === "en" ? "." : ",");
      chips.push(`⭐ ${ratingStr}/20${revCount ? ` (${revCount})` : ""}`);
    }
    if (hasHostCoords && r.latitude != null && r.longitude != null) {
      const d = haversineKmLocal(hLat, hLng, Number(r.latitude), Number(r.longitude));
      if (isFinite(d)) chips.push(`📍 ${fmtDist(d)}${fromHostLbl ? ` ${fromHostLbl}` : ""}`);
    }
    if (r.default_service && typeof r.default_service === "string" && r.default_service.trim()) {
      chips.push(`✨ ${r.default_service.trim()}`);
    }

    // External menu/flipbook links
    const links: string[] = [];
    if (r.menu_url && typeof r.menu_url === "string") {
      const url = r.menu_url.startsWith("http") ? r.menu_url : `https://${r.menu_url}`;
      links.push(`📖 [${r.menu_name || menuLabel}](${url})`);
    }
    if (r.flipbook_url && typeof r.flipbook_url === "string") {
      const url = r.flipbook_url.startsWith("http") ? r.flipbook_url : `https://${r.flipbook_url}`;
      links.push(`📚 [${r.flipbook_name || flipbookLabel}](${url})`);
    }

    const header = `${i + 1}. **${r.name}**${loc ? ` — _${loc}_` : ""}`;
    const lines = [header];
    if (narrative) lines.push(narrative);
    if (chips.length) lines.push(chips.join(" · "));
    if (links.length) lines.push(links.join(" · "));
    return lines.join("\n\n");
  });

  const intro = lang === "en"
    ? `Here's a closer look at the previous picks:`
    : lang === "ar"
      ? `إليك نظرة أعمق على النتائج السابقة:`
      : `Voici un portrait plus détaillé des résultats précédents :`;
  return `${intro}\n\n${blocks.join("\n\n---\n\n")}${toMapMarker(ordered)}`;
}
