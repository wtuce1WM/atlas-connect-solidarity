// Widget Spotify embarquable : /embed/spotify/:slug?lang=fr&bg=EFE6D8|transparent&fit=w|h|wh
// Lit businesses.spotify_url et le convertit en player officiel Spotify.
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { applyEmbedBg, parseBg, parseFit, fitFlags } from "@/lib/embedFit";
import { Loader2 } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; none: string }> = {
  fr: { loading: "Chargement…", none: "Aucun lien Spotify pour cet établissement." },
  en: { loading: "Loading…", none: "No Spotify link for this business." },
  ar: { loading: "جار التحميل…", none: "لا يوجد رابط Spotify." },
};

/** Convertit une URL Spotify publique en URL d'embed officielle. */
export const toSpotifyEmbed = (raw: string, theme: "dark" | "light"): string | null => {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/(^|\.)spotify\.com$/.test(url.hostname)) return null;
    const path = url.pathname.replace(/^\/embed/, "");
    const m = path.match(/\/(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=oneworldmorocco&theme=${theme === "light" ? 1 : 0}`;
  } catch {
    return null;
  }
};

const EmbedSpotify = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];
  const theme = (params.get("theme") || "light") === "dark" ? "dark" : "light";
  const bgRaw = params.get("bg") || "";
  const surface = parseBg(bgRaw) || "transparent";
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  const compact = params.get("compact") === "1";

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => applyEmbedBg(bgRaw), [bgRaw]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const q = supabase.from("businesses").select("name, spotify_url").eq("is_active", true);
      const { data } = await (isUuid ? q.eq("id", slug) : q.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data?.name) document.title = `${data.name} — Spotify`;
      setUrl((data as any)?.spotify_url || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const embedUrl = useMemo(() => (url ? toSpotifyEmbed(url, theme) : null), [url, theme]);
  const height = compact ? 152 : 352;

  return (
    <div
      className={`w-full flex items-center justify-center ${fullHeight ? "h-screen min-h-screen overflow-hidden" : "min-h-0"} p-2`}
      style={{ background: surface }}
    >
      <div className={`w-full ${fullWidth ? "" : "max-w-[560px]"}`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {L.loading}
          </div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            title="Spotify"
            style={{
              width: "100%",
              height: fullHeight ? "100%" : height,
              minHeight: height,
              border: 0,
              borderRadius: 12,
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{L.none}</p>
        )}
      </div>
    </div>
  );
};

export default EmbedSpotify;
