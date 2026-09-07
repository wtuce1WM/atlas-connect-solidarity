import { normalize } from "./shared.ts";

/**
 * Routes factuelles COORDONNÉES et PRIX sur un établissement nommé.
 *
 * Même principe que les routes horaires / réservation : on répond depuis la
 * fiche, sans inventer. Rappel métier : seuls certains hôtels / riads ont un
 * prix renseigné (min_price / manual_price_range / avg_price_range). Quand rien
 * n'est publié, on le dit et on renvoie vers le contact — jamais d'estimation.
 */

export function isContactIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(coordonnees|contact|contacter|telephone|numero|tel|whatsapp|joindre|appeler|site web|site internet|adresse)\b/.test(n)) return true;
  if (/\b(contact|phone|phone number|call|reach|website|address)\b/.test(n)) return true;
  if (/(هاتف|رقم|اتصال|تواصل|عنوان|واتساب)/.test(text)) return true;
  return false;
}

export function isPriceIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(prix|tarifs?|combien (?:ca )?coute|combien pour|budget|cout|coute|par nuit|la nuit)\b/.test(n)) return true;
  if (/\b(price|prices|rate|rates|how much|cost|per night)\b/.test(n)) return true;
  if (/(سعر|أسعار|كم يكلف|بكم)/.test(text)) return true;
  return false;
}

export function buildContactAnswer(host: any, lang: "fr" | "en" | "ar"): string | null {
  if (!host?.name) return null;
  const lines: string[] = [];
  if (host.phone) lines.push(lang === "en" ? `Phone: ${host.phone}` : lang === "ar" ? `الهاتف: ${host.phone}` : `Téléphone : ${host.phone}`);
  if (host.whatsapp) lines.push(`WhatsApp : ${host.whatsapp}`.replace("WhatsApp :", lang === "fr" ? "WhatsApp :" : "WhatsApp:"));
  if (host.website) lines.push(lang === "en" ? `Website: ${host.website}` : lang === "ar" ? `الموقع: ${host.website}` : `Site web : ${host.website}`);
  const addr = [host.address, host.neighborhood, host.city].filter(Boolean).join(", ");
  if (addr) lines.push(lang === "en" ? `Address: ${addr}` : lang === "ar" ? `العنوان: ${addr}` : `Adresse : ${addr}`);

  if (!lines.length) {
    if (lang === "en") return `No contact details are published for **${host.name}** yet. I can show you the listing on the map, or help you find something similar nearby.`;
    if (lang === "ar") return `لا توجد بيانات تواصل منشورة لـ **${host.name}** حاليًا. يمكنني عرض الموقع على الخريطة أو اقتراح بديل قريب.`;
    return `Aucune coordonnée n'est publiée pour **${host.name}** pour le moment. Je peux t'afficher la fiche sur la carte, ou te proposer une adresse similaire à proximité.`;
  }

  const head = lang === "en"
    ? `Here are the contact details for **${host.name}** :`
    : lang === "ar"
      ? `إليك بيانات التواصل مع **${host.name}** :`
      : `Voici les coordonnées de **${host.name}** :`;
  return `${head}\n\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export function buildPriceAnswer(host: any, lang: "fr" | "en" | "ar"): string | null {
  if (!host?.name) return null;
  const min = host.min_price;
  const manual = host.manual_price_range;
  const avg = host.avg_price_range;

  if (min) {
    if (lang === "en") return `**${host.name}** starts from ${min} MAD. Rates vary by season and availability — the booking page shows the exact price for your dates.`;
    if (lang === "ar") return `تبدأ أسعار **${host.name}** من ${min} درهم. تختلف الأسعار حسب الموسم والتوفر.`;
    return `**${host.name}** démarre à partir de ${min} MAD. Les tarifs varient selon la saison et la disponibilité — la page de réservation affiche le prix exact pour tes dates.`;
  }
  if (manual || avg) {
    const range = String(manual || avg);
    if (lang === "en") return `Indicative price range for **${host.name}** : ${range}. For an exact rate, the booking page or a direct message is the most reliable.`;
    if (lang === "ar") return `نطاق السعر التقريبي لـ **${host.name}** : ${range}. للحصول على سعر دقيق، يُفضّل صفحة الحجز أو التواصل المباشر.`;
    return `Fourchette de prix indicative pour **${host.name}** : ${range}. Pour un tarif exact, le plus fiable reste la page de réservation ou un message direct.`;
  }

  const contact = host.phone
    ? (lang === "en" ? ` by phone at ${host.phone}` : lang === "ar" ? ` عبر الهاتف ${host.phone}` : ` au ${host.phone}`)
    : host.whatsapp
      ? (lang === "en" ? ` on WhatsApp at ${host.whatsapp}` : lang === "ar" ? ` عبر واتساب ${host.whatsapp}` : ` sur WhatsApp au ${host.whatsapp}`)
      : "";
  if (lang === "en") return `No price is published for **${host.name}** — we only have rates for some hotels and riads. The best way is to ask the team directly${contact}.`;
  if (lang === "ar") return `لا يوجد سعر منشور لـ **${host.name}** — تتوفر الأسعار فقط لبعض الفنادق والرياضات. الأفضل سؤال الفريق مباشرة${contact}.`;
  return `Aucun prix n'est publié pour **${host.name}** — nous n'avons les tarifs que pour certains hôtels et riads. Le plus simple est de demander directement à l'équipe${contact}.`;
}
