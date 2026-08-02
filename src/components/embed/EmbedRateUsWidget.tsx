// Widget « Laisser un avis » : incite fortement à noter l'établissement
// sur Google / TripAdvisor lorsque le lien d'avis est disponible.
import { Star, ExternalLink } from "lucide-react";
import { useState } from "react";

type Lang = "fr" | "en" | "ar";
export type RateVariant = "card" | "bar";

export interface RateTarget {
  key: "google" | "tripadvisor";
  name: string;
  logo: string;
  url: string;
  rating: number | null;
  count: number | null;
}

const LABELS: Record<Lang, Record<string, string>> = {
  fr: {
    kicker: "Votre avis compte",
    title: "Vous avez aimé votre expérience ?",
    subtitle: "Une minute suffit pour laisser un avis — et aider les prochains voyageurs à nous trouver.",
    cta: "Laisser un avis sur",
    reviews: "avis",
    thanks: "Merci !",
    rateOn: "Notez-nous sur",
    barTitle: "Laissez-nous un avis",
  },
  en: {
    kicker: "Your review matters",
    title: "Enjoyed your experience?",
    subtitle: "One minute is all it takes — and it helps the next travellers find us.",
    cta: "Write a review on",
    reviews: "reviews",
    thanks: "Thank you!",
    rateOn: "Rate us on",
    barTitle: "Leave us a review",
  },
  ar: {
    kicker: "رأيك يهمنا",
    title: "هل أعجبتك تجربتك؟",
    subtitle: "دقيقة واحدة تكفي لكتابة رأيك — وتساعد المسافرين القادمين على إيجادنا.",
    cta: "اكتب رأيك على",
    reviews: "آراء",
    thanks: "شكراً!",
    rateOn: "قيّمنا على",
    barTitle: "اترك لنا رأيك",
  },
};

function StarPicker({ onPick, size = 30 }: { onPick: () => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div dir="ltr" className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i}/5`}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onClick={onPick}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            style={{ width: size, height: size }}
            className={i <= hover ? "text-gold fill-gold" : "text-gold/35"}
          />
        </button>
      ))}
    </div>
  );
}

export default function EmbedRateUsWidget({
  businessName,
  targets,
  lang = "fr",
  variant = "card",
}: {
  businessName: string;
  targets: RateTarget[];
  lang?: Lang;
  variant?: RateVariant;
}) {
  const L = LABELS[lang];
  const primary = targets[0];
  const openPrimary = () => {
    if (primary) window.open(primary.url, "_blank", "noopener,noreferrer");
  };

  const buttons = (
    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
      {targets.map((t) => (
        <a
          key={t.key}
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex-1 flex items-center justify-center gap-2.5 rounded-full border border-gold/45 bg-gold/12 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/25 transition-colors"
        >
          <img
            src={t.logo}
            alt={t.name}
            className="h-5 w-5 rounded object-contain"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          <span className="whitespace-nowrap">
            {L.cta} {t.name}
          </span>
          <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );

  if (variant === "bar") {
    return (
      <div
        className="w-full mx-auto rounded-2xl border border-white/15 bg-neutral-900/95 px-4 py-3.5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)] flex flex-wrap items-center gap-3 justify-between"
        style={{ fontFamily: "'Montserrat', sans-serif", maxWidth: 780 }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{L.kicker}</p>
          <p className="text-sm font-bold truncate">{L.barTitle}</p>
        </div>
        <StarPicker onPick={openPrimary} size={22} />
        <div className="flex items-center gap-2 flex-wrap">
          {targets.map((t) => (
            <a
              key={t.key}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/45 bg-gold/12 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25 transition-colors"
            >
              <img
                src={t.logo}
                alt={t.name}
                className="h-4 w-4 rounded object-contain"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
              {t.name}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden w-full mx-auto rounded-3xl border border-white/15 bg-neutral-900/95 p-5 sm:p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      style={{ fontFamily: "'Montserrat', sans-serif", maxWidth: 460 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl"
        style={{ background: "rgba(212,175,55,0.22)" }}
      />
      <div className="relative space-y-3.5 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{L.kicker}</p>
        <h2 className="text-lg font-bold leading-tight">{L.title}</h2>
        <p className="text-sm font-semibold text-gold">{businessName}</p>
        <div className="flex justify-center pt-1">
          <StarPicker onPick={openPrimary} />
        </div>
        <p className="text-[13px] text-white/70 leading-relaxed">{L.subtitle}</p>
        {buttons}
        {targets.some((t) => t.rating) && (
          <div dir="ltr" className="flex items-center justify-center gap-3 flex-wrap pt-1">
            {targets
              .filter((t) => t.rating)
              .map((t) => (
                <span key={t.key} className="text-[11px] text-white/55">
                  {t.name} {t.rating?.toFixed(1)}/5
                  {t.count ? ` · ${t.count.toLocaleString("fr-FR")} ${L.reviews}` : ""}
                </span>
              ))}
          </div>
        )}
        <div className="pt-1">
          <a
            href="https://oneworldmorocco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/45 hover:text-white/80 transition-colors"
          >
            oneworldmorocco.com
          </a>
        </div>
      </div>
    </div>
  );
}
