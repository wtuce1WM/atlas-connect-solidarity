import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

type Lang = "fr" | "en" | "ar";

type SubstackItem = {
  title: string;
  link: string;
  pubDate: string;
  excerpt: string;
  image: string | null;
};

interface InlineSubstackWidgetProps {
  url: string;
  language: Lang;
}

const LABELS: Record<Lang, { loading: string; empty: string; subscribe: string }> = {
  fr: { loading: "Chargement des articles…", empty: "Aucun article trouvé.", subscribe: "S'abonner" },
  en: { loading: "Loading posts…", empty: "No posts found.", subscribe: "Subscribe" },
  ar: { loading: "جار التحميل…", empty: "لم يتم العثور على مقالات.", subscribe: "اشترك" },
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/substack-feed`;

const InlineSubstackWidget = ({ url, language }: InlineSubstackWidgetProps) => {
  const [items, setItems] = useState<SubstackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const labels = LABELS[language];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${FN_URL}?url=${encodeURIComponent(url)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items.slice(0, 10) : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url]);

  const formatDate = (date: string) => {
    const timestamp = Date.parse(date);
    if (Number.isNaN(timestamp)) return "";
    return new Date(timestamp).toLocaleDateString(language === "en" ? "en-GB" : language === "ar" ? "ar-MA" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="w-full bg-transparent p-2" dir={language === "ar" ? "rtl" : "ltr"}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> {labels.loading}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/70">{labels.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <a
              key={item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 rounded-2xl bg-[hsl(var(--substack-card))] p-3 text-[hsl(var(--substack-card-foreground))] transition-opacity hover:opacity-90"
            >
              {item.image && (
                <img src={item.image} alt={item.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
              )}
              <div className="min-w-0 flex-1 text-left">
                <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
                {item.pubDate && <p className="mt-0.5 text-[11px] opacity-60">{formatDate(item.pubDate)}</p>}
                {item.excerpt && <p className="mt-1 line-clamp-2 text-xs opacity-75">{item.excerpt}</p>}
              </div>
            </a>
          ))}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--substack-brand))] px-5 py-2 text-sm font-semibold text-[hsl(var(--substack-brand-foreground))] transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" /> {labels.subscribe}
          </a>
        </div>
      )}
    </div>
  );
};

export default InlineSubstackWidget;