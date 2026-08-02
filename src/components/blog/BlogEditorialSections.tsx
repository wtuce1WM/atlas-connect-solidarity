import { useState } from "react";
import { Waves, Clock3, Copy, Check, Sparkles } from "lucide-react";

/**
 * Editorial (long-form) sections for the blog article template.
 * Used by articles that are driven by prose rather than by a list of
 * establishments (e.g. surf / tides guides), and that embed the free
 * ONE WORLD MOROCCO widgets at chosen points of the reading flow.
 */
export interface BlogEditorialSection {
  /** "text" (default) = prose block, "widget" = embedded widget, "entries" = insert the establishment list here. */
  kind?: "text" | "widget" | "entries";
  pretitle?: string;
  title?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Which widget presentation to render when kind === "widget". */
  widget?: "tides_live" | "tides_plan" | "tides_install";
  widgetCity?: string;
}

const SITE = "https://oneworldmorocco.com";

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
}) => (
  <iframe
    src={`/embed/tides?city=${encodeURIComponent(city)}&lang=fr${picker ? "&picker=1" : ""}`}
    title={title}
    loading="lazy"
    className="w-full rounded-xl border border-border/40 bg-background"
    style={{ height }}
  />
);

/** 1. Live band — right after the introduction. */
const TidesLive = ({ city }: { city: string }) => (
  <section className="py-14 bg-[#3B3B3B]">
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
          <Waves className="h-3.5 w-3.5" />
          Marées en direct
        </span>
        <span className="inline-flex items-center rounded-full bg-[#25D366]/15 border border-[#25D366]/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#25D366]">
          Gratuit
        </span>
      </div>
      <h2 className="text-2xl md:text-4xl font-bold mb-3 font-['Playfair_Display'] italic leading-tight text-white">
        L'état de la mer à {city}, maintenant
      </h2>
      <p className="text-white/75 leading-relaxed mb-7 max-w-2xl">
        Niveau de la mer en direct, sens de la marée, prochaines pleines et basses mers,
        marnage, température de l'eau, houle et période des vagues — tout ce qu'il faut
        vérifier avant de charger la planche.
      </p>
      <TidesFrame city={city} height={500} title={`Marées ${city}`} />
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
