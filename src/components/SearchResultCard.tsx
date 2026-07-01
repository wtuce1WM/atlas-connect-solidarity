import { Building2, Star, MapPin, Leaf, Truck, Accessibility, Package, Award, Bookmark } from "lucide-react";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { useBookmark } from "@/hooks/useBookmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOpenStatus } from "@/hooks/useOpenStatus";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";


export interface SearchResultBusiness {
  id: string;
  name: string;
  images?: string[] | null;
  logo_url?: string | null;
  rating?: number | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  categories?: string[] | null;
  default_service?: string | null;
  is_open_24h?: boolean;
  show_opening_hours?: boolean | null;
  opening_hours?: Record<string, any> | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  engagements?: string[];
  wtuce_status?: string | null;
}

interface SearchResultCardProps {
  business: SearchResultBusiness;
  index: number;
  labelLogos: string[];
  distanceKm: number | null;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const FR_TO_EN: Record<string, string> = {
  lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
  vendredi: "friday", samedi: "saturday", dimanche: "sunday",
};
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

function getOpenBadge(business: SearchResultBusiness): { label: string; variant: "open" | "upcoming" } | null {
  if (!business.is_open_24h && !business.show_opening_hours) return null;
  if (business.is_open_24h) return { label: "Ouvert 24h", variant: "open" };
  if (!business.opening_hours) return null;

  const rawOH = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
  const oh = Object.entries(rawOH).reduce((acc, [k, v]) => {
    acc[FR_TO_EN[k] || k] = v;
    return acc;
  }, {} as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>);

  const now = new Date();
  const todayKey = DAYS[now.getDay()];
  if (isCurrentlyOpenCheck(oh[todayKey])) return { label: "Ouvert", variant: "open" };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dh = oh[todayKey];
  let badge: string | null = null;
  if (dh && !dh.closed && dh.open) {
    const [oH, oM] = dh.open.split(":").map(Number);
    if (oH * 60 + (oM || 0) > nowMin) badge = `Ouvre à ${dh.open}`;
    else if (dh.open2 && !dh.continuous) {
      const [oH2, oM2] = dh.open2.split(":").map(Number);
      if (oH2 * 60 + (oM2 || 0) > nowMin) badge = `Ouvre à ${dh.open2}`;
    }
  }
  if (!badge) {
    for (let i = 1; i <= 7; i++) {
      const idx = (now.getDay() + i) % 7;
      const nd = oh[DAYS[idx]];
      if (nd && !nd.closed && nd.open) {
        badge = `Ouvre ${DAY_LABELS[idx]} à ${nd.open}`;
        break;
      }
    }
  }
  return badge ? { label: badge, variant: "upcoming" } : null;
}

function getLogIcon(l: string) {
  const lower = l.toLowerCase();
  if (lower.includes("livraison")) return Truck;
  if (lower.includes("pmr") || lower.includes("handicap") || lower.includes("accès")) return Accessibility;
  return Package;
}

export default function SearchResultCard({ business, index, labelLogos, distanceKm, onClick, onMouseEnter, onMouseLeave }: SearchResultCardProps) {
  const rawImg = business.images?.[0] || business.logo_url;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const size = Math.round(450 * dpr);
  const img = optimizeSupabaseImage(rawImg, { width: size, height: size, resize: "cover", quality: 75 });
  const isPriority = index < 2;
  const avgOn20 = business.computed_rating ?? business.rating ?? null;
  const totalReviews = business.total_review_count ?? 0;
  const subcat = business.categories?.[0] || null;
  const openBadge = getOpenBadge(business);

  const engs = business.engagements || [];
  const standards = engs.filter(e => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
  const certifications = engs.filter(e => e.startsWith("Certification:")).map(e => e.replace("Certification:", "").trim());
  const logistics = engs.filter(e => e.startsWith("Logistique:")).map(e => e.replace("Logistique:", "").trim());
  const hasEngagements = standards.length > 0 || logistics.length > 0 || certifications.length > 0;
  const { isBookmarked, isLoggedIn: isBookmarkLoggedIn, toggle: toggleBookmark } = useBookmark(business.id);

  return (
    <div
      data-result-card={index === 0 ? "true" : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group overflow-hidden rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer relative aspect-square bg-muted"
    >
      {img ? (
        <img
          src={img}
          alt={business.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading={isPriority ? "eager" : "lazy"}
          decoding="async"
          {...({ fetchpriority: isPriority ? "high" : "low" } as any)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {distanceKm != null && (
        <span className="absolute bottom-2 right-2 z-[16] px-1.5 py-0.5 rounded text-[10px] font-semibold text-gold bg-black/60 backdrop-blur-sm whitespace-nowrap">
          {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
        </span>
      )}

      <div className="absolute top-2 right-2 z-[20]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={async () => {
            if (!isBookmarkLoggedIn) {
              window.dispatchEvent(new CustomEvent("open-generic-club-popup"));
              return;
            }
            await toggleBookmark();
          }}
          className="h-9 w-9 flex items-center justify-center rounded-full glass-toolbar-btn text-black hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#F1F1F1" }}
          aria-label={isBookmarked ? "Retirer des favoris" : "Le Club OWM"}
          title={isBookmarked ? "Retirer des favoris" : "Le Club OWM"}
        >
          <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 z-[15] flex flex-wrap gap-1">
        {subcat && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold text-gold-foreground">{subcat}</span>
        )}
        {engs.includes("Logistique:Commandez en ligne et recevez votre colis chez vous") && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: "#C04F17" }}>
            Commandez en ligne
          </span>
        )}
        {business.default_service && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black text-white border border-white/20">{business.default_service}</span>
        )}
        {openBadge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${openBadge.variant === "open" ? "bg-[#25D366] text-black" : "bg-primary text-primary-foreground"}`}>
            {openBadge.label}
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-[15] p-3 space-y-1">
        {labelLogos.length > 0 && (
          <div className="flex gap-2">
            {labelLogos.map((logoUrl, li) => (
              <img key={li} src={logoUrl} alt="" className="h-14 w-auto object-contain drop-shadow-lg" />
            ))}
          </div>
        )}
        <p className="font-semibold text-base text-white leading-tight line-clamp-2" style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "0.02em" }}>{business.name}</p>
        {avgOn20 !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Star className="h-3 w-3 text-gold fill-gold" />
            <span className="font-medium text-white">{avgOn20}/20</span>
            {totalReviews > 0 && <span className="text-white/70">· {totalReviews} avis</span>}
          </div>
        )}
        {business.city && (
          <div className="flex items-center gap-1 text-xs text-white/85">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.neighborhood ? `${business.city}, ${business.neighborhood}` : business.city}</span>
          </div>
        )}
        {hasEngagements && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {certifications.map((c, i) => (
              <span key={`c-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/30 text-amber-200 backdrop-blur-sm">
                <Award className="h-2.5 w-2.5" />{c}
              </span>
            ))}
            {standards.map((e, i) => (
              <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/30 text-green-200 backdrop-blur-sm">
                <Leaf className="h-2.5 w-2.5" />{e}
              </span>
            ))}
            {logistics.map((l, i) => {
              const Icon = getLogIcon(l);
              return (
                <span key={`l-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/30 text-blue-200 backdrop-blur-sm">
                  <Icon className="h-2.5 w-2.5" />{l}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
