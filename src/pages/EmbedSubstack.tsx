// Widget Substack embarquable : /embed/substack/:slug?lang=fr&bg=…&fit=…&limit=3
// Lit businesses.substack_url et affiche les derniers articles via l'edge function substack-feed.
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { applyEmbedBg, parseBg, parseFit, fitFlags } from "@/lib/embedFit";
import { Loader2, ExternalLink } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const MESSAGES: Record<Lang, { loading: string; none: string; read: string; all: string }> = {
  fr: { loading: "Chargement des articles…", none: "Aucune newsletter pour cet établissement.", read: "Lire", all: "Voir toute la newsletter" },
  en: { loading: "Loading posts…", none: "No newsletter for this business.", read: "Read", all: "See the whole newsletter" },
  ar: { loading: "جار التحميل…", none: "لا توجد نشرة إخبارية.", read: "اقرأ", all: "كل النشرة" },
};

type Item = { title: string; link: string; pubDate: string; excerpt: string; image: string | null };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/substack-feed`;

const EmbedSubstack = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();

  const langParam = (params.get("lang") || "fr").toLowerCase();
  const lang: Lang = langParam === "en" || langParam === "ar" ? (langParam as Lang) : "fr";
  const L = MESSAGES[lang];
  const bgRaw = params.get("bg") || "";
  const surface = parseBg(bgRaw) || "transparent";
  const { fullWidth, fullHeight } = fitFlags(parseFit(params.get("fit")));
  const limit = Math.max(1, Math.min(10, Number(params.get("limit")) || 3));

  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    return applyEmbedBg(bgRaw);
  }, [lang, bgRaw]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const q = supabase.from("businesses").select("name, substack_url").eq("is_active", true);
      const { data } = await (isUuid ? q.eq("id", slug) : q.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data?.name) document.title = `${data.name} — Newsletter`;
      const target = (data as any)?.substack_url || null;
      setFeedUrl(target);
      if (!target) { setLoading(false); return; }
      try {
        const res = await fetch(`${FN_URL}?url=${encodeURIComponent(target)}`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.items)) setItems(json.items.slice(0, limit));
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, limit]);

  const fmtDate = (d: string) => {
    const t = Date.parse(d);
    if (Number.isNaN(t)) return "";
    return new Date(t).toLocaleDateString(lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <div
      className={`w-full flex justify-center ${fullHeight ? "h-screen min-h-screen overflow-auto" : "min-h-0"} p-2`}
      style={{ background: surface }}
    >
      <div className={`w-full ${fullWidth ? "" : "max-w-[560px]"} flex flex-col gap-2`}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {L.loading}
          </div>
        ) : !feedUrl || items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{L.none}</p>
        ) : (
          <>
            {items.map((it) => (
              <a
                key={it.link}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-2xl border border-border bg-background p-3 transition-colors hover:bg-background/80"
              >
                {it.image && (
                  <img
                    src={it.image}
                    alt={it.title}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{it.title}</h3>
                  {it.pubDate && <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(it.pubDate)}</p>}
                  {it.excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.excerpt}</p>}
                </div>
              </a>
            ))}
            <a
              href={feedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/40"
            >
              {L.all} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default EmbedSubstack;
