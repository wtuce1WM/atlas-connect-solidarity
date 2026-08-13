import { supabase } from "@/integrations/supabase/client";
import { parseFit, type EmbedFit } from "@/lib/embedFit";

/**
 * Source unique de vérité des paramètres d'affichage des widgets embarqués.
 * Hiérarchie : défaut global (widget_settings) → surcharge établissement
 * (business_widget_settings). Aucun composant ne doit re-décider ces valeurs.
 */

export const SITE = "https://oneworldmorocco.com";

export type WidgetType = {
  id: string;
  widget_key: string;
  label: string;
  description: string | null;
  embed_path: string | null;
  sort_order: number;
  is_active: boolean;
};

export type WidgetSettingsFields = {
  bg_light: string | null;
  bg_dark: string | null;
  card_mode: string | null;
  theme: string | null;
  fit: string | null;
  height: number | null;
  max_width: number | null;
  radius: number | null;
  lang: string | null;
  options: Record<string, any>;
};

export type WidgetDefaults = WidgetSettingsFields & {
  id: string;
  widget_key: string;
};

export type WidgetOverride = WidgetSettingsFields & {
  id: string;
  widget_key: string;
  business_id: string;
};

export type ResolvedWidgetSettings = {
  widget_key: string;
  bgLight: string;
  bgDark: string;
  cardMode: "widget" | "transparent" | "dark" | "light";
  theme: "light" | "dark";
  fit: EmbedFit;
  height: number;
  maxWidth: number | null;
  radius: number;
  lang: string;
  options: Record<string, any>;
  /** true si au moins un champ vient d'une surcharge établissement. */
  overridden: boolean;
};

const HEX = /^#[0-9A-F]{6}$/i;
export const normalizeHex = (raw: string | null | undefined): string => {
  const v = (raw || "").trim();
  const withHash = v.startsWith("#") ? v : v ? `#${v}` : "";
  return HEX.test(withHash) ? withHash.toUpperCase() : "";
};

export const FALLBACK: ResolvedWidgetSettings = {
  widget_key: "",
  bgLight: "",
  bgDark: "",
  cardMode: "widget",
  theme: "light",
  fit: "",
  height: 480,
  maxWidth: null,
  radius: 20,
  lang: "fr",
  options: {},
  overridden: false,
};

const pick = <T,>(over: T | null | undefined, base: T | null | undefined, fb: T): T => {
  if (over !== null && over !== undefined && (over as any) !== "") return over;
  if (base !== null && base !== undefined && (base as any) !== "") return base;
  return fb;
};

export const resolveWidgetSettings = (
  widgetKey: string,
  defaults?: Partial<WidgetSettingsFields> | null,
  override?: Partial<WidgetSettingsFields> | null,
): ResolvedWidgetSettings => {
  const overriddenKeys = override
    ? (Object.keys(override) as (keyof WidgetSettingsFields)[]).filter((k) => {
        const v = (override as any)[k];
        if (k === "options") return v && Object.keys(v).length > 0;
        return v !== null && v !== undefined && v !== "";
      })
    : [];
  return {
    widget_key: widgetKey,
    bgLight: normalizeHex(pick(override?.bg_light, defaults?.bg_light, "")),
    bgDark: normalizeHex(pick(override?.bg_dark, defaults?.bg_dark, "")),
    cardMode: pick(override?.card_mode, defaults?.card_mode, "widget") as ResolvedWidgetSettings["cardMode"],
    theme: (pick(override?.theme, defaults?.theme, "light") === "dark" ? "dark" : "light"),
    fit: parseFit(pick(override?.fit, defaults?.fit, "")),
    height: Number(pick(override?.height, defaults?.height, 480)) || 480,
    maxWidth: (pick(override?.max_width, defaults?.max_width, null) as number | null) || null,
    radius: Number(pick(override?.radius, defaults?.radius, 20)) ?? 20,
    lang: String(pick(override?.lang, defaults?.lang, "fr")),
    options: { ...(defaults?.options || {}), ...(override?.options || {}) },
    overridden: overriddenKeys.length > 0,
  };
};

/* ------------------------------- Lectures ------------------------------- */

export const fetchWidgetCatalog = async (): Promise<WidgetType[]> => {
  const { data } = await (supabase as any)
    .from("widget_types")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data || []) as WidgetType[];
};

export const fetchWidgetDefaults = async (): Promise<Record<string, WidgetDefaults>> => {
  const { data } = await (supabase as any).from("widget_settings").select("*");
  const map: Record<string, WidgetDefaults> = {};
  (data || []).forEach((r: any) => (map[r.widget_key] = r));
  return map;
};

export const fetchBusinessWidgetOverrides = async (
  businessId: string,
): Promise<Record<string, WidgetOverride>> => {
  const { data } = await (supabase as any)
    .from("business_widget_settings")
    .select("*")
    .eq("business_id", businessId);
  const map: Record<string, WidgetOverride> = {};
  (data || []).forEach((r: any) => (map[r.widget_key] = r));
  return map;
};

/** Réglages résolus d'un widget pour un établissement (ou globaux si null). */
export const loadWidgetSettings = async (
  widgetKey: string,
  businessId?: string | null,
): Promise<ResolvedWidgetSettings> => {
  const [defaults, overrides] = await Promise.all([
    fetchWidgetDefaults(),
    businessId ? fetchBusinessWidgetOverrides(businessId) : Promise.resolve({}),
  ]);
  return resolveWidgetSettings(widgetKey, defaults[widgetKey], (overrides as any)[widgetKey]);
};

/* ------------------------------- Écritures ------------------------------ */

export const saveWidgetDefaults = async (widgetKey: string, patch: Partial<WidgetSettingsFields>) => {
  const { error } = await (supabase as any)
    .from("widget_settings")
    .upsert({ widget_key: widgetKey, ...patch }, { onConflict: "widget_key" });
  if (error) throw error;
};

export const saveWidgetOverride = async (
  businessId: string,
  widgetKey: string,
  patch: Partial<WidgetSettingsFields>,
) => {
  const { error } = await (supabase as any)
    .from("business_widget_settings")
    .upsert({ business_id: businessId, widget_key: widgetKey, ...patch }, { onConflict: "business_id,widget_key" });
  if (error) throw error;
};

export const deleteWidgetOverride = async (businessId: string, widgetKey: string) => {
  const { error } = await (supabase as any)
    .from("business_widget_settings")
    .delete()
    .eq("business_id", businessId)
    .eq("widget_key", widgetKey);
  if (error) throw error;
};

/* ------------------------------- URL / code ----------------------------- */

/** Construit l'URL d'un widget à partir de ses réglages résolus. */
export const buildWidgetUrl = (
  widget: Pick<WidgetType, "widget_key" | "embed_path">,
  s: ResolvedWidgetSettings,
  o: { origin?: string; slug?: string | null; extra?: Record<string, string | number | boolean | undefined> } = {},
): string => {
  const origin = o.origin || SITE;
  const path = (widget.embed_path || `/embed/${widget.widget_key}`).replace(
    ":slug",
    o.slug || "riad-dar-najat",
  );
  const p = new URLSearchParams();
  p.set("lang", s.lang);
  p.set("theme", s.theme);
  const bg = s.theme === "dark" ? s.bgDark || s.bgLight : s.bgLight;
  if (s.cardMode === "transparent") {
    p.set("bg", "transparent");
    if (bg) p.set("card", bg.slice(1));
  } else if (bg) {
    p.set("bg", bg.slice(1));
  }
  if (s.fit) p.set("fit", s.fit);
  Object.entries(o.extra || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  return `${origin}${path}?${p.toString()}`;
};

export const buildWidgetSnippet = (url: string, s: ResolvedWidgetSettings, title: string) => {
  const width = s.fit === "w" || s.fit === "wh" || !s.maxWidth ? "" : `max-width:${s.maxWidth}px;`;
  const height =
    s.fit === "h" || s.fit === "wh" ? `height:100%;min-height:${s.height}px` : `height:${s.height}px`;
  return `<div style="width:100%;${width}margin:0 auto">
  <iframe src="${url}" style="width:100%;display:block;${height};border:0;border-radius:${s.radius}px;background:transparent" title="${title}" loading="lazy"></iframe>
</div>`;
};

/* ------------------------------- Analytics ------------------------------ */

const deviceKind = () => {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
};

/** Journalise un affichage ou une interaction de widget (fire & forget). */
export const logWidgetEvent = async (o: {
  widgetKey: string;
  businessId?: string | null;
  eventType?: "load" | "interaction";
  action?: string;
  lang?: string;
  meta?: Record<string, any>;
}) => {
  try {
    let host = "";
    let pageUrl = "";
    if (typeof window !== "undefined") {
      pageUrl = (document.referrer || window.location.href).slice(0, 512);
      try {
        host = new URL(pageUrl).host;
      } catch {
        host = window.location.host;
      }
    }
    await (supabase as any).from("widget_events").insert({
      widget_key: o.widgetKey,
      business_id: o.businessId || null,
      event_type: o.eventType || "load",
      action: o.action || null,
      host: host || null,
      page_url: pageUrl || null,
      device: deviceKind(),
      lang: o.lang || null,
      meta: o.meta || {},
    });
  } catch {
    /* jamais bloquant pour l'affichage du widget */
  }
};

export type WidgetAnalytics = {
  total_loads: number;
  total_interactions: number;
  by_widget: { widget_key: string; loads: number; interactions: number }[];
  by_host: { host: string; events: number }[];
  by_device: { device: string; events: number }[];
  by_day: { day: string; loads: number; interactions: number }[];
  by_action: { action: string; events: number }[];
};

export const fetchWidgetAnalytics = async (days = 30, businessId?: string | null) => {
  const { data, error } = await (supabase as any).rpc("get_widget_analytics", {
    p_days: days,
    p_business_id: businessId || null,
  });
  if (error) throw error;
  return (data || {}) as WidgetAnalytics;
};
