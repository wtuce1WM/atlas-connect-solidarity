import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import OverlayShell from "@/components/overlays/OverlayShell";
import SubstackIcon from "@/components/icons/SubstackIcon";

interface SubstackArticle {
  title: string;
  link: string;
  pubDate: string;
  excerpt: string;
  image: string | null;
}

interface SubstackArticlesOverlayProps {
  substackUrl: string;
  businessName?: string;
  onClose: () => void;
}

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
};

const SubstackArticlesOverlay = ({ substackUrl, businessName, onClose }: SubstackArticlesOverlayProps) => {
  const [items, setItems] = useState<SubstackArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const endpoint = `https://${projectId}.supabase.co/functions/v1/substack-feed?url=${encodeURIComponent(substackUrl)}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || "Erreur de chargement");
        setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [substackUrl]);

  return (
    <OverlayShell zClass="z-[90]" bg="bg-background" animClass="" className="">
      <div className="flex flex-col h-full" style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}>
        <div className="relative flex items-center px-4 py-2 border-b bg-background shrink-0">
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 transition-opacity shrink-0"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 ml-3 min-w-0">
            <SubstackIcon className="h-4 w-4 text-[#FF6719] shrink-0" />
            <span className="text-sm font-semibold truncate">
              {businessName ? `${businessName} — Substack` : "Articles Substack"}
            </span>
          </div>
          <a
            href={substackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-3 h-9 px-3 flex items-center gap-1.5 rounded-full bg-[#FF6719] text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">S'abonner</span>
          </a>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="px-4 py-8 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun article trouvé.</div>
          )}
          {!loading && !error && items.length > 0 && (
            <ul className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-2">
              {items.map((it, i) => (
                <li key={i} className="overflow-hidden rounded-lg border bg-background">
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full flex-col gap-3 p-3 transition-opacity hover:opacity-90 sm:flex-row"
                  >
                    {it.image && (
                      <img
                        src={it.image}
                        alt=""
                        className="aspect-[16/10] w-full object-cover rounded-md shrink-0 sm:h-44 sm:w-52"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">{it.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(it.pubDate)}</p>
                      {it.excerpt && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-3 sm:line-clamp-5">{it.excerpt}</p>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </OverlayShell>
  );
};

export default SubstackArticlesOverlay;
