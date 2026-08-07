// Widget SoundCloud embarquable : /embed/soundcloud/:slug?lang=fr&bg=…&fit=…
// Lit businesses.soundcloud_url et le charge dans le player officiel SoundCloud.
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { applyEmbedBg, parseBg, parseFit, fitFlags } from "@/lib/embedFit";
import { Loader2 } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; none: string }> = {
  fr: { loading: "Chargement…", none: "Aucun lien SoundCloud pour cet établissement." },
  en: { loading: "Loading…", none: "No SoundCloud link for this business." },
  ar: { loading: "جار التحميل…", none: "لا يوجد رابط SoundCloud." },
};

/** Player officiel SoundCloud pour une URL publique soundcloud.com. */
export const toSoundcloudEmbed = (
  raw: string,
  opts: { color: string; visual: boolean },
): string | null => {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/(^|\.)soundcloud\.com$/.test(url.hostname)) return null;
    const color = (opts.color || "#E2725B").replace("#", "");
    const p = new URLSearchParams({
      url: url.toString(),
      color: `#${color}`,
      auto_play: "false",
      hide_related: "true",
      show_comments: "false",
      show_user: "true",
      show_reposts: "false",
      show_teaser: "false",
      visual: opts.visual ? "true" : "false",
    });
    return `https://w.soundcloud.com/player/?${p.toString()}`;
  } catch {
    return null;
  }
};

const EmbedSoundcloud = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];
  const bgRaw = params.get("bg") || "";
  const surface = parseBg(bgRaw) || "transparent";
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  const visual = params.get("visual") !== "0";
  const color = parseBg(params.get("color")) || "#E2725B";

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => applyEmbedBg(bgRaw), [bgRaw]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const q = supabase.from("businesses").select("name, soundcloud_url").eq("is_active", true);
      const { data } = await (isUuid ? q.eq("id", slug) : q.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data?.name) document.title = `${data.name} — SoundCloud`;
      setUrl((data as any)?.soundcloud_url || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const embedUrl = useMemo(() => (url ? toSoundcloudEmbed(url, { color, visual }) : null), [url, color, visual]);
  const height = visual ? 400 : 166;

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
            title="SoundCloud"
            scrolling="no"
            style={{
              width: "100%",
              height: fullHeight ? "100%" : height,
              minHeight: height,
              border: 0,
              borderRadius: 12,
            }}
            allow="autoplay"
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{L.none}</p>
        )}
      </div>
    </div>
  );
};

export default EmbedSoundcloud;
