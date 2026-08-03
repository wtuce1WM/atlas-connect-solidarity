import { useMemo } from "react";
import { CTA_MODE_LABELS } from "@/components/slidepanel/CtaBar";

/* ────── helpers (module-level, not recreated per render) ────── */

export function normalizeCtaMode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, " ")
    .replace(/\+/g, " plus ")
    .replace(/[\s/-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || null;
}

export function isAppStoreCta(ctaKey: string | null | undefined, presentationMode: string | null | undefined): boolean {
  const raw = ctaKey || presentationMode;
  if (!raw) return false;
  const n = raw.toLowerCase().replace(/[\s_-]+/g, "");
  return n === "appstore" || n === "googleplay";
}

function pickLangLabel(pair: { fr: string; en: string; ar: string }, language: string): string {
  if (language === "en") return pair.en;
  if (language === "ar") return pair.ar;
  return pair.fr;
}

export function resolveCtaLabel(
  preferredValue: string | null | undefined,
  fallbackValue: string | null | undefined,
  defaultKey: keyof typeof CTA_MODE_LABELS,
  language: string,
): string {
  // The current CTA field (preferredValue) is authoritative. If it is set, we
  // only try to translate it — never fall back to the legacy presentation_mode,
  // which would otherwise override a freeform label like "En savoir +".
  const translate = (v: string | null | undefined) => {
    if (!v) return null;
    return CTA_MODE_LABELS[v] || CTA_MODE_LABELS[normalizeCtaMode(v) || ""] || null;
  };

  if (preferredValue) {
    const match = translate(preferredValue);
    return match ? pickLangLabel(match, language) : preferredValue;
  }

  const fallbackMatch = translate(fallbackValue);
  if (fallbackMatch) return pickLangLabel(fallbackMatch, language);
  if (fallbackValue) return fallbackValue;
  const pair = CTA_MODE_LABELS[defaultKey];
  return pickLangLabel(pair, language);
}

/* ────── hook ────── */

interface CtaResult {
  fullUrl: string;
  forceExternal?: boolean;
}

export function useCtaConfig(business: any, language: string) {
  const bookUrl = business?.reserve_now_url || null;
  const shopUrl = business?.online_shop_url || null;

  const bookingCta = useMemo<CtaResult | null>(() => {
    const ctaLabel = business?.reserve_now_cta || business?.presentation_mode || "";
    const isWaCta = ctaLabel.toLowerCase().replace(/[\s_-]/g, "") === "whatsapp";
    if (!bookUrl && !(isWaCta && business?.whatsapp)) return null;
    const fullUrl = bookUrl ? (bookUrl.startsWith("http") ? bookUrl : `https://${bookUrl}`) : "";
    const isReserveUrl = !!business?.reserve_now_url;
    const forceExternal = isReserveUrl ? business?.reserve_now_force_external : business?.website_force_external;
    return { fullUrl, forceExternal };
  }, [bookUrl, business?.reserve_now_url, business?.reserve_now_force_external, business?.website_force_external, business?.reserve_now_cta, business?.presentation_mode, business?.whatsapp]);

  const shopCta = useMemo<CtaResult | null>(() => {
    const ctaLabel = business?.online_shop_cta || business?.online_shop_presentation_mode || "";
    const isWaCta = ctaLabel.toLowerCase().replace(/[\s_-]/g, "") === "whatsapp";
    if (!shopUrl && !(isWaCta && business?.whatsapp)) return null;
    const fullUrl = shopUrl ? (shopUrl.startsWith("http") ? shopUrl : `https://${shopUrl}`) : "";
    return { fullUrl, forceExternal: business?.online_shop_force_external };
  }, [shopUrl, business?.online_shop_force_external, business?.online_shop_cta, business?.online_shop_presentation_mode, business?.whatsapp]);

  const url4Cta = useMemo<CtaResult | null>(() => {
    const url = business?.url_4;
    const ctaLabel = business?.url_4_cta || business?.url_4_presentation_mode || "";
    const isWaCta = ctaLabel.toLowerCase().replace(/[\s_-]/g, "") === "whatsapp";
    if (!url && !(isWaCta && business?.whatsapp)) return null;
    const fullUrl = url ? (url.startsWith("http") ? url : `https://${url}`) : "";
    return { fullUrl, forceExternal: business?.url_4_force_external };
  }, [business?.url_4, business?.url_4_force_external, business?.url_4_cta, business?.url_4_presentation_mode, business?.whatsapp]);

  const url5Cta = useMemo<CtaResult | null>(() => {
    const url = business?.url_5;
    const ctaLabel = business?.url_5_cta || business?.url_5_presentation_mode || "";
    const isWaCta = ctaLabel.toLowerCase().replace(/[\s_-]/g, "") === "whatsapp";
    if (!url && !(isWaCta && business?.whatsapp)) return null;
    const fullUrl = url ? (url.startsWith("http") ? url : `https://${url}`) : "";
    return { fullUrl, forceExternal: business?.url_5_force_external };
  }, [business?.url_5, business?.url_5_force_external, business?.url_5_cta, business?.url_5_presentation_mode, business?.whatsapp]);

  const bookingCtaLabel = resolveCtaLabel(business?.reserve_now_cta, business?.presentation_mode, "reserver_en_ligne", language);
  const shopCtaLabel = resolveCtaLabel(business?.online_shop_cta, business?.online_shop_presentation_mode, "acheter_en_ligne", language);
  const url4CtaLabel = resolveCtaLabel(business?.url_4_cta, business?.url_4_presentation_mode, "acheter_en_ligne", language);
  const url5CtaLabel = resolveCtaLabel(business?.url_5_cta, business?.url_5_presentation_mode, "acheter_en_ligne", language);

  const appStoreLinks = useMemo(() => {
    const links: { type: "app_store" | "google_play"; url: string }[] = [];
    const seen = new Set<string>();
    const normalize = (v: string | null | undefined): "app_store" | "google_play" | null => {
      if (!v) return null;
      const lower = v.toLowerCase().replace(/[\s_-]+/g, "");
      if (lower === "appstore") return "app_store";
      if (lower === "googleplay") return "google_play";
      return null;
    };
    const checks = [
      { key: business?.presentation_mode, url: business?.website },
      { key: business?.reserve_now_cta || business?.presentation_mode, url: business?.reserve_now_url },
      { key: business?.online_shop_cta || business?.online_shop_presentation_mode, url: business?.online_shop_url },
      { key: business?.url_4_cta || business?.url_4_presentation_mode, url: business?.url_4 },
      { key: business?.url_5_cta || business?.url_5_presentation_mode, url: business?.url_5 },
    ];
    for (const c of checks) {
      if (!c.url || !c.key) continue;
      const type = normalize(c.key);
      if (type && !seen.has(type)) {
        seen.add(type);
        const fullUrl = c.url.startsWith("http") ? c.url : `https://${c.url}`;
        links.push({ type, url: fullUrl });
      }
    }
    return links;
  }, [business]);

  // Filter out AppStore CTAs from the button row
  const effectiveBookingCta = isAppStoreCta(business?.reserve_now_cta, business?.presentation_mode) ? null : bookingCta;
  const effectiveShopCta = isAppStoreCta(business?.online_shop_cta, business?.online_shop_presentation_mode) ? null : shopCta;
  const effectiveUrl4Cta = isAppStoreCta(business?.url_4_cta, business?.url_4_presentation_mode) ? null : url4Cta;
  const effectiveUrl5Cta = isAppStoreCta(business?.url_5_cta, business?.url_5_presentation_mode) ? null : url5Cta;

  return {
    bookUrl,
    shopUrl,
    bookingCta: effectiveBookingCta,
    shopCta: effectiveShopCta,
    url4Cta: effectiveUrl4Cta,
    url5Cta: effectiveUrl5Cta,
    bookingCtaLabel,
    shopCtaLabel,
    url4CtaLabel,
    url5CtaLabel,
    appStoreLinks,
  };
}
