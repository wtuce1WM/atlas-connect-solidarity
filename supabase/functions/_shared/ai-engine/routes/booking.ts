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

  const intro = lang === "en"
    ? `Here's which of these places let you book online right now, and how to reach the others directly:`
    : lang === "ar"
      ? `إليك أي من هذه الأماكن يتيح الحجز عبر الإنترنت الآن، وكيفية التواصل مع الآخرين مباشرة:`
      : `Voici lesquels de ces établissements permettent de réserver en ligne dès maintenant, et comment joindre les autres directement :`;

  const yesOnline = lang === "en" ? "✅ Yes, you can book online" : lang === "ar" ? "✅ نعم، يمكنك الحجز عبر الإنترنت" : "✅ Oui, vous pouvez réserver en ligne";
  const noOnline = lang === "en" ? "❌ No online booking — contact directly" : lang === "ar" ? "❌ لا حجز عبر الإنترنت — تواصل مباشرة" : "❌ Pas de réservation en ligne — contactez directement";
  const phoneLbl = lang === "en" ? "Phone" : lang === "ar" ? "هاتف" : "Tél";
  const waLbl = "WhatsApp";

  const blocks: string[] = [];
  for (const b of ordered) {
    const links = collectLinks(b);
    const loc = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const header = `**${b.name}**${loc ? ` — ${loc}` : ""}`;
    const hook = pickHook(b);
    const status = links.length ? yesOnline : noOnline;

    const parts: string[] = [];
    parts.push(header);
    if (hook) parts.push(hook);
    parts.push(status);

    if (links.length) {
      const linksLine = links.map((c) => `[${c.label}](${c.url})`).join(" · ");
      parts.push(linksLine);
    }

    const contacts: string[] = [];
    if (b.phone) {
      const digits = String(b.phone).replace(/[^\d+]/g, "");
      contacts.push(`📞 [${phoneLbl} ${b.phone}](tel:${digits})`);
    }
    if (b.whatsapp) {
      const wa = String(b.whatsapp).replace(/\D/g, "");
      contacts.push(`💬 [${waLbl} ${b.whatsapp}](https://wa.me/${wa})`);
    }
    if (contacts.length) parts.push(contacts.join(" · "));

    blocks.push(parts.join("\n\n"));
  }

  const outro = lang === "en"
    ? `\n\nWant me to focus on the ones you can book right now?`
    : lang === "ar"
      ? `\n\nهل تريد أن أركز على الأماكن التي يمكنك حجزها الآن؟`
      : `\n\nJe me concentre sur ceux que tu peux réserver directement en ligne ?`;

  return `${intro}\n\n${blocks.join("\n\n---\n\n")}${outro}`;
}
