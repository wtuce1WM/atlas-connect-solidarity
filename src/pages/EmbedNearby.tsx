// Standalone embeddable "À proximité" overlay: /embed/nearby/:slug?lang=fr
// Réutilise l'overlay POI de BookOnlineSlidePanel (aucun fork de logique).
import { Suspense, lazy, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyEmbedBg } from "@/lib/embedFit";
import { useWidgetTracking } from "@/hooks/useWidgetTracking";
import { useWidgetParams } from "@/hooks/useWidgetParams";

const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

const MESSAGES = {
  fr: { loading: "Chargement…", notFound: "Établissement introuvable." },
  en: { loading: "Loading…", notFound: "Business not found." },
  ar: { loading: "جار التحميل…", notFound: "لم يتم العثور على المؤسسة." },
};

type Lang = keyof typeof MESSAGES;

const EmbedNearby = () => {
  const { slug } = useParams<{ slug: string }>();
  const { params, businessId: widgetBusinessId, overlay } = useWidgetParams("nearby", { slug });
  useWidgetTracking("nearby", widgetBusinessId, params.get("lang") || undefined);
  const { setLanguage } = useLanguage();

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];

  const bgParam = params.get("bg") || "";
  // En overlay (Full Description) : aucun réglage backoffice n'est utilisé, la
  // carte porte TOUJOURS la même couleur pour tous les établissements.
  const OVERLAY_MAP_COLOR = "#ECD6B8";
  const rawColor = overlay
    ? OVERLAY_MAP_COLOR
    : /^#?[0-9a-fA-F]{6}$/.test(bgParam)
    ? bgParam
    : "";

  const mapBaseColor = /^#?[0-9a-fA-F]{6}$/.test(rawColor)
    ? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`)
    : null;
  // Default widget map uses native Google Maps colors; custom color overrides the light theme.
  const mapTheme: "light" | "dark" | "default-light" | "default-dark" = mapBaseColor ? "light" : "default-light";



  const [businessId, setBusinessId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Le fond (ex. ?bg=ECD6B8) n'est peint qu'une fois les tuiles de la carte
  // affichées : avant ça la page reste transparente, donc aucun flash de couleur.
  const [mapPainted, setMapPainted] = useState(false);

  useEffect(() => {
    setLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = "À proximité — One World Morocco";
  }, [lang, setLanguage]);

  useEffect(() => {
    // Avant la peinture des tuiles : transparent (l'hôte reste visible, aucun flash).
    // En overlay, la page reste transparente : seule la carte porte la couleur.
    return applyEmbedBg(mapPainted && !overlay ? mapBaseColor : "transparent");
  }, [mapPainted, mapBaseColor, overlay]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      // Pas de filtre is_active : la fiche de référence peut être désactivée
      // (ex. Délégation Régionale Du Tourisme Marrakech) — elle ne sert que de
      // point de départ de la carte.
      const query = supabase.from("businesses").select("id");
      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data?.id) setBusinessId(data.id);
      else setNotFound(true);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-sm text-muted-foreground">
        {L.notFound}
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      style={{ background: mapPainted && !overlay ? (mapBaseColor ?? "transparent") : "transparent" }}
    >
      {!businessId ? (
        <div className="h-full w-full" />
      ) : (
        <Suspense fallback={<div className="h-full w-full" />}>
          <BookOnlineSlidePanel
            businessId={businessId}
            initialOverlay="poi"
            embedMode
            mapBaseColor={mapPainted ? mapBaseColor : null}
            mapTheme={mapTheme}
            onMapReady={() => setMapPainted(true)}
            hideDirections
            onClose={() => { /* embed: pas de fermeture, l'overlay reste affiché */ }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default EmbedNearby;
