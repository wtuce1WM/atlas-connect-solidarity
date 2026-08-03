import { useEffect, useMemo, useRef, useState } from "react";
import { Waves, Clock3, Copy, Check, Sparkles, Wind, Bell, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Editorial (long-form) sections for the blog article template.
 * Used by articles that are driven by prose rather than by a list of
 * establishments (e.g. surf / tides guides), and that embed the free
 * ONE WORLD MOROCCO widgets at chosen points of the reading flow.
 */
export interface BlogEditorialSection {
  /** "text" (default) = prose block, "widget" = embedded widget, "entries" = insert the establishment list here, "carousel" = horizontal establishment carousel. */
  kind?: "text" | "widget" | "entries" | "carousel";
  pretitle?: string;
  title?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Which widget presentation to render when kind === "widget". */
  widget?: "tides_live" | "tides_plan" | "tides_install";
  widgetCity?: string;
  /** Carousel filters (kind === "carousel"). */
  carouselCity?: string;
  /** Default subcategory (first entry of businesses.categories). */
  carouselSubcategory?: string;
  /** Business names pinned first, in order. */
  carouselFirst?: string[];
}

const SITE = "https://oneworldmorocco.com";

type CarouselBusiness = {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  computed_rating: number | null;
  hook_fr: string | null;
  categories: string[] | null;
};

/** Horizontal carousel of establishments filtered by city + default subcategory. */
const BusinessCarousel = ({ section }: { section: BlogEditorialSection }) => {
  const [items, setItems] = useState<CarouselBusiness[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const city = section.carouselCity || "Essaouira";
  const sub = (section.carouselSubcategory || "Sports nautiques").toLowerCase();
  const pinned = useMemo(
    () => (section.carouselFirst || []).map((n) => n.toLowerCase()),
    [section.carouselFirst],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,name,city,neighborhood,images,computed_rating,hook_fr,categories")
        .eq("is_active", true)
        .eq("city", city)
        .limit(200);
      if (cancelled || !data) return;
      const filtered = (data as CarouselBusiness[]).filter(
        (b) => (b.categories?.[0] || "").toLowerCase() === sub,
      );
      filtered.sort((a, b) => {
        const pa = pinned.indexOf(a.name.toLowerCase());
        const pb = pinned.indexOf(b.name.toLowerCase());
        if (pa !== -1 || pb !== -1) {
          if (pa === -1) return 1;
          if (pb === -1) return -1;
          return pa - pb;
        }
        return (b.computed_rating ?? 0) - (a.computed_rating ?? 0);
      });
      setItems(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, [city, sub, pinned]);

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {section.pretitle && (
              <p className="text-sm uppercase tracking-wider mb-2 text-primary">{section.pretitle}</p>
            )}
            {section.title && (
              <h2 className="text-2xl md:text-4xl font-bold font-['Playfair_Display'] italic leading-tight text-foreground">
                {section.title}
              </h2>
            )}
          </div>
          <div className="hidden md:flex gap-2 shrink-0">
            <button
              type="button"
              aria-label="Précédent"
              onClick={() => scrollBy(-1)}
              className="h-10 w-10 rounded-full border border-border bg-muted/40 text-foreground grid place-items-center transition hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Suivant"
              onClick={() => scrollBy(1)}
              className="h-10 w-10 rounded-full border border-border bg-muted/40 text-foreground grid place-items-center transition hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {section.paragraphs && section.paragraphs.length > 0 && (
          <div className="space-y-4 mb-6 text-foreground/85">
            {section.paragraphs.map((p, i) => (
              <p key={i} className="text-base md:text-lg leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
        >
          {items.map((b) => (
            <a
              key={b.id}
              href={`/search?openBusiness=${b.id}`}
              className="group relative shrink-0 snap-start w-[260px] md:w-[300px] overflow-hidden rounded-2xl border border-border bg-muted/20"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {b.images?.[0] ? (
                  <img
                    src={b.images[0]}
                    alt={b.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                {typeof b.computed_rating === "number" && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-gold">
                    <Star className="h-3 w-3 fill-gold" />
                    {Number(b.computed_rating).toFixed(1)}/20
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {b.neighborhood && (
                    <p className="text-[11px] uppercase tracking-wider text-white/70">{b.neighborhood}</p>
                  )}
                  <p className="text-base font-bold text-white leading-snug">{b.name}</p>
                </div>
              </div>
              {b.hook_fr && (
                <p className="p-3 text-sm leading-relaxed text-foreground/75 line-clamp-3">{b.hook_fr}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};


/**
 * Auto-resizing tides iframe: the embed posts its measured height
 * ("owm-tides-height"), so the frame never needs an inner scrollbar.
 */
const TidesFrame = ({
  city,
  picker = false,
  height = 470,
  title,
}: {
  city: string;
  picker?: boolean;
  height?: number;
  title: string;
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; height?: number } | null;
      if (!data || data.type !== "owm-tides-height" || typeof data.height !== "number") return;
      if (frameRef.current && event.source !== frameRef.current.contentWindow) return;
      setAutoHeight(Math.max(240, Math.ceil(data.height) + 8));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      src={`/embed/tides?city=${encodeURIComponent(city)}&lang=fr${picker ? "&picker=1" : ""}`}
      title={title}
      loading="lazy"
      scrolling="no"
      className="w-full rounded-xl border border-border/40 bg-background overflow-hidden"
      style={{ height: autoHeight ?? height }}
    />
  );
};


/** 1. Live band — right after the introduction. */
const TidesLive = ({ city }: { city: string }) => (
  <section className="py-14 bg-[#3B3B3B]">
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          <Waves className="h-3.5 w-3.5" />
          Marées, vents & météo
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <Bell className="h-3.5 w-3.5" />
          Alertes email
        </span>
        <span className="inline-flex items-center rounded-full bg-[#25D366]/15 border border-[#25D366]/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
          Gratuit
        </span>
      </div>
      <h2 className="text-2xl md:text-4xl font-bold mb-3 font-['Playfair_Display'] italic leading-tight text-white">
        L'état de la mer, du vent et du ciel à {city}, maintenant
      </h2>
      <p className="text-white/75 leading-relaxed mb-7 max-w-2xl">
        Trois vues dans un seul widget : <strong className="text-white">Marées</strong> (niveau
        en direct, sens de la marée, pleines et basses mers, marnage, coefficient, houle,
        période, température de l'eau), <strong className="text-white">Vent</strong> (rose des
        vents sur carte satellite, force Beaufort, rafales, prévision horaire) et{" "}
        <strong className="text-white">Météo</strong> (3 ou 7 jours). Le bouton ⚙️ en haut à
        droite permet de changer de ville et de s'abonner aux alertes email.
      </p>
      <TidesFrame city={city} height={520} title={`Marées, vents et météo ${city}`} />

    </div>
  </section>
);

/** 2. Planning card — mid-article, with city picker. */
const TidesPlan = ({ city }: { city: string }) => (
  <section className="py-16 bg-background">
    <div className="container mx-auto px-4 max-w-5xl">
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 items-start rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
        <div>
          <p className="text-sm uppercase tracking-wider mb-2 text-primary">Préparez votre session</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 font-['Playfair_Display'] italic leading-tight text-foreground">
            Choisissez votre créneau, pas seulement votre spot
          </h2>
          <ul className="space-y-3 text-foreground/80 leading-relaxed">
            <li className="flex gap-3">
              <Clock3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>Repérez la mi-marée montante : le créneau le plus régulier pour la plupart des niveaux.</span>
            </li>
            <li className="flex gap-3">
              <Waves className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>Croisez houle et période : une longue période transforme une petite houle en belle vague.</span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>Changez de ville dans le widget pour comparer 19 spots du littoral marocain.</span>
            </li>
          </ul>
        </div>
        <TidesFrame city={city} picker height={540} title="Marées — choix de la ville" />
      </div>
    </div>
  </section>
);

/** 3. Install block — end of article, with copyable iframe code. */
const TidesInstall = ({ city }: { city: string }) => {
  const [copied, setCopied] = useState(false);
  const code = `<iframe src="${SITE}/embed/tides?city=${encodeURIComponent(city)}&lang=fr&picker=1" title="Marées Maroc — One World Morocco" width="100%" height="520" style="border:0;border-radius:16px" loading="lazy"></iframe>`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="py-16 bg-[#3B3B3B]">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <p className="text-sm uppercase tracking-wider mb-2 text-gold/80">Widget gratuit</p>
        <h2 className="text-2xl md:text-4xl font-bold mb-4 font-['Playfair_Display'] italic leading-tight text-white">
          Installez le Widget Marées sur votre site
        </h2>
        <p className="text-white/75 leading-relaxed mb-8">
          École de surf, riad, maison d'hôtes, agence ou blog : copiez une ligne de code,
          sans clé API, sans compte. 19 villes du littoral atlantique et méditerranéen marocain.
        </p>
        <div className="text-left rounded-xl border border-white/15 bg-black/50 p-4 md:p-5">
          <pre className="overflow-x-auto text-[11px] md:text-xs leading-relaxed text-white/85 whitespace-pre-wrap break-all font-mono">
            {code}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold/90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Code copié" : "Copier le code"}
          </button>
        </div>
      </div>
    </section>
  );
};

const TextSection = ({
  section,
  isDark,
}: {
  section: BlogEditorialSection;
  isDark: boolean;
}) => (
  <section className={`py-14 ${isDark ? "bg-[#3B3B3B]" : "bg-background"}`}>
    <div className="container mx-auto px-4 max-w-3xl">
      {section.pretitle && (
        <p className={`text-sm uppercase tracking-wider mb-2 ${isDark ? "text-gold/80" : "text-primary"}`}>
          {section.pretitle}
        </p>
      )}
      {section.title && (
        <h2
          className={`text-2xl md:text-4xl font-bold mb-5 font-['Playfair_Display'] italic leading-tight ${
            isDark ? "text-white" : "text-foreground"
          }`}
        >
          {section.title}
        </h2>
      )}
      <div className={`space-y-4 ${isDark ? "text-white/85" : "text-foreground/85"}`}>
        {section.paragraphs?.map((p, i) => (
          <p key={i} className="text-base md:text-lg leading-relaxed">
            {p}
          </p>
        ))}
      </div>
      {section.bullets && section.bullets.length > 0 && (
        <ul className={`mt-5 space-y-2.5 ${isDark ? "text-white/85" : "text-foreground/85"}`}>
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? "bg-gold" : "bg-primary"}`} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);

const BlogEditorialSections = ({
  sections,
  entriesBlock,
}: {
  sections: BlogEditorialSection[];
  entriesBlock?: React.ReactNode;
}) => {
  let textIndex = 0;
  return (
    <>
      {sections.map((section, i) => {
        if (section.kind === "entries") return <div key={i}>{entriesBlock}</div>;
        if (section.kind === "widget") {
          const city = section.widgetCity || "Essaouira";
          if (section.widget === "tides_plan") return <TidesPlan key={i} city={city} />;
          if (section.widget === "tides_install") return <TidesInstall key={i} city={city} />;
          return <TidesLive key={i} city={city} />;
        }
        const isDark = textIndex % 2 === 1;
        textIndex += 1;
        return <TextSection key={i} section={section} isDark={isDark} />;
      })}
    </>
  );
};

export default BlogEditorialSections;
