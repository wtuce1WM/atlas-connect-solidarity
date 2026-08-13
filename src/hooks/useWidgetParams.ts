import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadWidgetSettings, type ResolvedWidgetSettings } from "@/lib/widgetSettings";

/**
 * Source unique de vérité côté page embarquée : les paramètres d'URL gagnent
 * toujours, et les réglages du backoffice (défaut global + surcharge
 * établissement) comblent ce qui n'est pas passé dans l'URL.
 *
 * Aucune page /embed/* ne doit décider elle-même d'une couleur de fond,
 * d'un thème ou d'un mode `fit` par défaut.
 */
export function useWidgetParams(
  widgetKey: string,
  opts: { slug?: string | null; businessId?: string | null } = {},
) {
  const [urlParams] = useSearchParams();
  const slug = opts.slug || null;
  const [businessId, setBusinessId] = useState<string | null>(opts.businessId || null);
  const [settings, setSettings] = useState<ResolvedWidgetSettings | null>(null);

  // Résolution de l'établissement (pour les surcharges) à partir du slug.
  useEffect(() => {
    if (opts.businessId) {
      setBusinessId(opts.businessId);
      return;
    }
    if (!slug) {
      setBusinessId(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (alive) setBusinessId((data as any)?.id || null);
    })();
    return () => {
      alive = false;
    };
  }, [slug, opts.businessId]);

  useEffect(() => {
    let alive = true;
    loadWidgetSettings(widgetKey, businessId)
      .then((s) => alive && setSettings(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [widgetKey, businessId]);

  // `?preset=overlay` : rendu interne (overlay Full Description du slidepanel).
  // Les réglages backoffice (couleurs de fond, thème, fit) sont volontairement
  // ignorés pour que tous les établissements aient le même traitement visuel ;
  // ces réglages restent utilisés pour les vrais embeds sur les sites hôtes.
  const overlay = (urlParams.get("preset") || "").toLowerCase() === "overlay";

  const params = useMemo(() => {
    const p = new URLSearchParams(urlParams.toString());
    if (overlay || !settings) return p;
    const setIf = (k: string, v: string | number | null | undefined) => {
      if (v !== null && v !== undefined && v !== "" && !p.has(k)) p.set(k, String(v));
    };
    // Fond : jamais écrasé si l'hôte a passé bg/card explicitement.
    if (!p.has("bg") && !p.has("card")) {
      const bg = settings.theme === "dark" ? settings.bgDark || settings.bgLight : settings.bgLight;
      if (settings.cardMode === "transparent") {
        p.set("bg", "transparent");
        if (bg) p.set("card", bg.slice(1));
      } else if (bg) {
        p.set("bg", bg.slice(1));
      }
    }
    setIf("theme", settings.theme);
    setIf("fit", settings.fit);
    setIf("lang", settings.lang);
    return p;
  }, [urlParams, settings, overlay]);

  return { params, businessId, settings: overlay ? null : settings, overlay, ready: overlay || settings !== null };
}

