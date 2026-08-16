// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, fetchPriorFull, orderByIds, toMapMarker } from "./shared.ts";

export function isBookingIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(reserv|reservation|booker|reserver)\b/i.test(n)) return true;
  if (/\b(book(?:ing)?|reserve|make a reservation)\b/i.test(n)) return true;
  if (/(حجز|احجز|يحجز)/.test(text)) return true;
  return false;
}

export function isReserveCta(cta: string | null | undefined, mode: string | null | undefined): boolean {
  const raw = `${cta || ""} ${mode || ""}`;
  const n = normalize(raw);
  if (!n) return false;
  if (/reserv/.test(n)) return true; // reserve / reservez / reserver_en_ligne / reservation
  if (/\bbook(?:ing)?\b/.test(n)) return true;
  if (/billet/.test(n)) return true; // billetterie / billet en ligne / tickets
  if (/\btickets?\b/.test(n)) return true;
  return false;
}

export function buildBookingAnswer(host: any, lang: "fr" | "en" | "ar"): string {
  const candidates: { url: string; label: string }[] = [];
  const push = (url: any, cta: any, mode: any) => {
    if (!url || typeof url !== "string") return;
    if (!isReserveCta(cta, mode)) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const label = (cta && String(cta).trim()) || (lang === "en" ? "Book online" : lang === "ar" ? "احجز عبر الإنترنت" : "Réserver en ligne");
    candidates.push({ url: fullUrl, label });
  };
  push(host.reserve_now_url, host.reserve_now_cta, host.presentation_mode);
  push(host.online_shop_url, host.online_shop_cta, host.online_shop_presentation_mode);
  push(host.url_4, host.url_4_cta, host.url_4_presentation_mode);
  push(host.url_5, host.url_5_cta, host.url_5_presentation_mode);

  if (candidates.length) {
    const first = candidates[0];
    const linksLine = candidates.map((c) => `[${c.label}](${c.url})`).join(" · ");
    if (lang === "en") {
      return `Yes — you can book **${host.name}** online right now. ${linksLine}\n\nWould you like me to suggest a great table or activity to combine with your stay?`;
    }
    if (lang === "ar") {
      return `نعم — يمكنك حجز **${host.name}** مباشرة عبر الإنترنت. ${linksLine}\n\nهل تريد اقتراح مطعم أو نشاط لتكمل إقامتك؟`;
    }
    return `Oui — tu peux réserver **${host.name}** en ligne dès maintenant. ${linksLine}\n\nJe peux te suggérer une belle table ou une activité à combiner avec ton séjour ?`;
  }

  // No online reservation URL — fallback to phone/WhatsApp
  const contacts: string[] = [];
  if (host.whatsapp) contacts.push(lang === "en" ? `WhatsApp: ${host.whatsapp}` : lang === "ar" ? `واتساب: ${host.whatsapp}` : `WhatsApp : ${host.whatsapp}`);
  if (host.phone) contacts.push(lang === "en" ? `phone: ${host.phone}` : lang === "ar" ? `هاتف: ${host.phone}` : `téléphone : ${host.phone}`);
  const contactLine = contacts.length ? contacts.join(" · ") : (host.website || "");
  if (lang === "en") {
    return `**${host.name}** doesn't offer online booking on this page. The team handles reservations directly${contactLine ? ` — ${contactLine}` : ""}. Would you like me to suggest something to do nearby?`;
  }
  if (lang === "ar") {
    return `**${host.name}** لا يوفر الحجز عبر الإنترنت على هذه الصفحة. يتولى الفريق الحجوزات مباشرة${contactLine ? ` — ${contactLine}` : ""}. هل تريد اقتراحات قريبة؟`;
  }
  return `**${host.name}** ne propose pas de réservation en ligne sur cette page. L'équipe s'occupe des réservations directement${contactLine ? ` — ${contactLine}` : ""}. Je peux te suggérer quelque chose à faire à proximité ?`;
}

export async function buildBookingForBusinesses(admin: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, city, neighborhood, phone, whatsapp, hook_fr, hook_en, hook_ar, description, description_en, description_ar, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, url_5_cta, url_5_presentation_mode, website, website_cta")
    .in("id", ids.slice(0, 20));
  if (error || !Array.isArray(data) || !data.length) return null;

  const byId = new Map<string, any>(data.map((b: any) => [b.id, b]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const defaultLabel = lang === "en" ? "Book online" : lang === "ar" ? "احجز عبر الإنترنت" : "Réserver en ligne";
  const stripHtml = (s: string): string =>
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  const pickHook = (b: any): string => {
    const raw = lang === "en" ? (b.hook_en || b.hook_fr || b.description_en || b.description || "")
      : lang === "ar" ? (b.hook_ar || b.hook_fr || b.description_ar || b.description || "")
      : (b.hook_fr || b.hook_en || b.description || b.description_en || "");
    return stripHtml(String(raw || "")).replace(/\s+/g, " ").trim();
  };
  const collectLinks = (b: any): { url: string; label: string }[] => {
    const out: { url: string; label: string }[] = [];
    const push = (url: any, cta: any, mode: any) => {
      if (!url || typeof url !== "string") return;
      if (!isReserveCta(cta, mode)) return;
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const label = (cta && String(cta).trim()) || defaultLabel;
      out.push({ url: fullUrl, label });
    };
    push(b.reserve_now_url, b.reserve_now_cta, b.presentation_mode);
    push(b.online_shop_url, b.online_shop_cta, b.online_shop_presentation_mode);
    push(b.url_4, b.url_4_cta, b.url_4_presentation_mode);
    push(b.url_5, b.url_5_cta, b.url_5_presentation_mode);
    return out;
  };

  // Les cartes résultat IA portent déjà nom, quartier, hook, note, horaires ET les
  // CTA (Réservez / WhatsApp) : on ne réécrit plus la liste ici (zéro duplication).
  const withOnline = ordered.filter((b: any) => collectLinks(b).length).length;
  const totalCount = ordered.length;

  if (lang === "en") {
    return withOnline === 0
      ? `None of these places can be booked online — the WhatsApp button on each card is the fastest way to reach them. Want me to suggest others that do take online bookings?`
      : `${withOnline} of the ${totalCount} places can be booked online right away — use the **Book** button on each card below (WhatsApp for the others). Want me to focus on the bookable ones?`;
  }
  if (lang === "ar") {
    return withOnline === 0
      ? `لا يمكن حجز أي من هذه الأماكن عبر الإنترنت — زر واتساب على كل بطاقة هو أسرع طريقة للتواصل. هل أقترح أماكن أخرى تتيح الحجز؟`
      : `${withOnline} من ${totalCount} يمكن حجزها الآن عبر الإنترنت — استخدم زر **احجز** على كل بطاقة (وواتساب للبقية). هل أركّز على القابلة للحجز؟`;
  }
  return withOnline === 0
    ? `Aucun de ces établissements ne se réserve en ligne — le bouton WhatsApp sur chaque carte est le plus rapide pour les joindre. Je te propose des adresses réservables en ligne ?`
    : `${withOnline} des ${totalCount} adresses se réservent en ligne dès maintenant — le bouton **Réservez** est sur chaque carte ci-dessous (WhatsApp pour les autres). Je me concentre sur celles qui sont réservables ?`;
}
