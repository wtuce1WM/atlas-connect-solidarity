// Fiche établissement embarquable : /embed/fiche/:slug?lang=fr&bg=EFE6D8|transparent
// Réutilise BookOnlineSlidePanel — même mode de lecture que le panneau de droite
// des articles de blog (aucun fork de logique).
import { Suspense, lazy, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyEmbedBg, parseBg } from "@/lib/embedFit";
import { Loader2 } from "lucide-react";


const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

const MESSAGES = {
  fr: { loading: "Chargement…", notFound: "Établissement introuvable." },
  en: { loading: "Loading…", notFound: "Business not found." },
  ar: { loading: "جار التحميل…", notFound: "لم يتم العثور على المؤسسة." },
};

type Lang = keyof typeof MESSAGES;

const EmbedFiche = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const { setLanguage } = useLanguage();

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];

  // Couleur de fond du widget : ?bg=EFE6D8 (couleur pleine) ou ?bg=transparent
  const bgRaw = (params.get("bg") || "").trim();
  const bgColor = parseBg(bgRaw);
  const surface = bgColor || "transparent";

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, setLanguage]);

  useEffect(() => applyEmbedBg(bgRaw), [bgRaw]);


  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase.from("businesses").select("id, name").eq("is_active", true);
      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data?.id) {
        setBusinessId(data.id);
        document.title = `${data.name} — One World Morocco`;
      } else {
        setNotFound(true);
      }
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
    <div className="relative h-screen w-full overflow-hidden bg-background flex flex-col">
      {!businessId ? (
        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground animate-pulse">
          {L.loading}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Suspense
            fallback={
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <BookOnlineSlidePanel
              key={businessId}
              businessId={businessId}
              embedMode
              onClose={() => { /* embed : pas de fermeture */ }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default EmbedFiche;
