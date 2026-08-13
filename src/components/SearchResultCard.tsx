import { useEffect } from "react";
import { Building2, Star, MapPin, Leaf, Truck, Accessibility, Package, Award, Bookmark } from "lucide-react";
import { trackBusinessImpression, type ImpressionSurface } from "@/lib/businessAnalytics";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { useBookmark } from "@/hooks/useBookmark";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOpenStatus } from "@/hooks/useOpenStatus";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";
import { translateEngagementLabel } from "@/lib/engagementLabels";


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
  /** Surface d'apparition pour le compteur d'impressions (défaut: liste). */
  impressionSurface?: ImpressionSurface;
}




function getLogIcon(l: string) {
  const lower = l.toLowerCase();
  if (lower.includes("livraison")) return Truck;
  if (lower.includes("pmr") || lower.includes("handicap") || lower.includes("accès")) return Accessibility;
  return Package;
}

export default function SearchResultCard({ business, index, labelLogos, distanceKm, onClick, onMouseEnter, onMouseLeave, impressionSurface = "list" }: SearchResultCardProps) {
  const { language } = useLanguage();
  const { translateService, translateSubcategory } = useTaxonomyTranslations();
  const openStatus = useOpenStatus({ business, language });
  useEffect(() => { trackBusinessImpression(business.id, impressionSurface); }, [business.id, impressionSurface]);
  const rawImg = business.images?.[0] || business.logo_url;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const size = Math.round(450 * dpr);
  const img = optimizeSupabaseImage(rawImg, { width: size, height: size, resize: "cover", quality: 75 });
  const isPriority = index < 2;
  const avgOn20 = business.computed_rating ?? business.rating ?? null;
  const totalReviews = business.total_review_count ?? 0;
  const subcatRaw = business.categories?.[0] || null;
  const subcat = subcatRaw ? translateSubcategory(subcatRaw, language) : null;
  const defaultService = business.default_service ? translateService(business.default_service, language) : null;
  const openBadge = openStatus.text ? { label: openStatus.text, variant: (openStatus.isOpen ? "open" : "upcoming") as "open" | "upcoming" } : null;

  const engs = business.engagements || [];
  const standards = engs.filter(e => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
  const certifications = engs.filter(e => e.startsWith("Certification:")).map(e => e.replace("Certification:", "").trim());
  const logistics = engs.filter(e => e.startsWith("Logistique:")).map(e => e.replace("Logistique:", "").trim());
  const hasEngagements = standards.length > 0 || logistics.length > 0 || certifications.length > 0;
  const { isBookmarked, isLoggedIn: isBookmarkLoggedIn, toggle: toggleBookmark } = useBookmark(business.id);

  const orderOnlineLabel = language === "en" ? "Online store" : language === "ar" ? "متجر أونلاين" : "Vente en ligne";
  const reviewsLabel = language === "en" ? "reviews" : language === "ar" ? "تقييم" : "avis";
  const removeBookmarkLabel = language === "en" ? "Remove from favorites" : language === "ar" ? "إزالة من المفضلة" : "Retirer des favoris";


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
          aria-label={isBookmarked ? removeBookmarkLabel : "Le Club OWM"}
          title={isBookmarked ? removeBookmarkLabel : "Le Club OWM"}
        >
          <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 z-[15] flex flex-wrap gap-1">
        {subcat && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold text-gold-foreground">{subcat}</span>
        )}
        {engs.includes("Logistique:Vente en ligne") && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: "#C04F17" }}>
            {orderOnlineLabel}
          </span>
        )}
        {defaultService && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black text-white border border-white/20">{defaultService}</span>
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
            {totalReviews > 0 && <span className="text-white/70">· {totalReviews} {reviewsLabel}</span>}
          </div>
        )}
        {business.city && (
          <div className="flex items-center gap-1 text-xs text-white/85">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.neighborhood ? `${business.city}, ${business.neighborhood}` : business.city}</span>
          </div>
        )}
        {hasEngagements && (
          <div className="flex flex-col gap-1 mt-0.5 items-start">
            {[
              ...certifications.map((value) => ({ type: "cert" as const, value })),
              ...standards.map((value) => ({ type: "std" as const, value })),
              ...logistics.map((value) => ({ type: "log" as const, value })),
            ]
              .slice(0, 2)
              .map((item, i) => {
                if (item.type === "cert") {
                  return (
                    <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/30 text-amber-200 backdrop-blur-sm">
                      <Award className="h-2.5 w-2.5" />{translateEngagementLabel(item.value, language)}
                    </span>
                  );
                }
                if (item.type === "std") {
                  return (
                    <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/30 text-green-200 backdrop-blur-sm">
                      <Leaf className="h-2.5 w-2.5" />{translateEngagementLabel(item.value, language)}
                    </span>
                  );
                }
                const Icon = getLogIcon(item.value);
                return (
                  <span key={`e-${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/30 text-blue-200 backdrop-blur-sm">
                    <Icon className="h-2.5 w-2.5" />{translateEngagementLabel(item.value, language)}
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
