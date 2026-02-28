import { useState, useEffect } from "react";
import { X, MapPin, Phone, Mail, Globe, Star, BadgeCheck, ChevronLeft, ChevronRight, Clock, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { collectRatingSources, computeWeightedRatingOn20 } from "@/lib/ratingUtils";
import { formatDayHours as formatDayHoursDisplay, isCurrentlyOpen as isCurrentlyOpenCheck } from "@/lib/formatOpeningHours";
import logoGold from "@/assets/logoGOLDsimple.webp";

interface BusinessSlidePanelProps {
  businessId: string;
  onClose: () => void;
}

interface FullBusiness {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  wtuce_status: string | null;
  account_type: string | null;
  logo_url: string | null;
  images: string[] | null;
  categories: string[] | null;
  services: string[] | null;
  main_category: string | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  rating: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  restaurant_guru_rating: number | null;
  restaurant_guru_review_count: number | null;
  google_maps_url: string | null;
  google_reviews_url: string | null;
  tripadvisor_url: string | null;
  tripadvisor_review_url: string | null;
  restaurant_guru_url: string | null;
  booking_url: string | null;
  reserve_now_url: string | null;
  opening_hours: any;
  is_open_24h: boolean | null;
  show_opening_hours: boolean | null;
  gamme_id: string | null;
  latitude: number | null;
  longitude: number | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const BusinessSlidePanel = ({ businessId, onClose }: BusinessSlidePanelProps) => {
  const { language } = useLanguage();
  const [business, setBusiness] = useState<FullBusiness | null>(null);
  const [gamme, setGamme] = useState<Gamme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      setCurrentImageIndex(0);

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setBusiness(null);
        setIsLoading(false);
        return;
      }

      setBusiness(data as any);

      if (data.gamme_id) {
        const { data: g } = await supabase
          .from("gammes")
          .select("id, name_fr, color_hex, text_color_hex")
          .eq("id", data.gamme_id)
          .maybeSingle();
        if (g) setGamme(g);
      } else {
        setGamme(null);
      }

      setIsLoading(false);
    };
    fetch();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Établissement introuvable
      </div>
    );
  }

  const isVerified = business.wtuce_status === "verified";
  const isInstitution = business.account_type?.toLowerCase() === "institution";
  const images = business.images || [];
  const ratingSourcesForCalc = collectRatingSources(business);
  const computedOn20 = computeWeightedRatingOn20(ratingSourcesForCalc);
  const avgOn20 = business.rating ?? computedOn20;

  const reviews: { rating: number; count: number; label: string }[] = [];
  if (business.google_rating && business.google_review_count) reviews.push({ rating: business.google_rating, count: business.google_review_count, label: "Google" });
  if (business.tripadvisor_rating && business.tripadvisor_review_count) reviews.push({ rating: business.tripadvisor_rating, count: business.tripadvisor_review_count, label: "TripAdvisor" });
  if (business.restaurant_guru_rating && business.restaurant_guru_review_count) reviews.push({ rating: business.restaurant_guru_rating, count: business.restaurant_guru_review_count, label: "Restaurant Guru" });
  const totalReviewCount = reviews.reduce((s, r) => s + r.count, 0);

  const hook = language === "en" ? business.hook_en : language === "ar" ? business.hook_ar : business.hook_fr;

  // Opening hours
  let openStatus: { isOpen: boolean; label: string } | null = null;
  if (business.is_open_24h) {
    openStatus = { isOpen: true, label: "Ouvert 24h/24" };
  } else if (business.show_opening_hours !== false && business.opening_hours) {
    const check = isCurrentlyOpenCheck(business.opening_hours);
    if (check !== null) {
      openStatus = { isOpen: check, label: check ? "Ouvert" : "Fermé" };
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-background border-b border-border shrink-0">
        <h2 className="text-base font-semibold text-foreground truncate">{business.name}</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image carousel */}
        {images.length > 0 && (
          <div className="relative w-full aspect-[16/9] bg-muted cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
            <img
              src={images[currentImageIndex]}
              alt={`${business.name} - ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {isVerified && !isInstitution && (
              <img src={logoGold} alt="WTUCE" className="absolute top-3 right-3 w-12 h-12 object-contain opacity-90 pointer-events-none drop-shadow-lg" />
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? images.length - 1 : i - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === images.length - 1 ? 0 : i + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors shadow"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/80 text-xs text-foreground">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Name + badges */}
          <div>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground leading-tight">{business.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {avgOn20 !== null && (
                    <>
                      <Star className="h-4 w-4 text-gold fill-gold" />
                      <span className="font-bold text-gold">{avgOn20}/20</span>
                      {totalReviewCount > 0 && <span>· {totalReviewCount.toLocaleString("fr-FR")} avis</span>}
                      <span>·</span>
                    </>
                  )}
                  {isVerified && !isInstitution && (
                    <>
                      <BadgeCheck className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-gold">Vérifié</span>
                      <span>·</span>
                    </>
                  )}
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{business.city}{business.neighborhood ? `, ${business.neighborhood}` : ""}</span>
                </div>
              </div>
              {business.logo_url && (
                <div className="w-16 h-16 p-1.5 rounded-lg border border-border shrink-0 bg-background flex items-center justify-center">
                  <img src={business.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Opening status */}
          {openStatus && (
            <div className={`flex items-center gap-2 text-sm font-medium ${openStatus.isOpen ? "text-emerald-600" : "text-red-500"}`}>
              <Clock className="h-4 w-4" />
              {openStatus.label}
            </div>
          )}

          {/* Hook */}
          {hook && (
            <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-gold/30 pl-3">
              {hook}
            </p>
          )}

          {/* Description */}
          {business.description && (
            <>
              <div className="relative">
                <div
                  className={`text-sm text-foreground leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>br]:content-[''] [&>br]:block [&>br]:mb-2 overflow-hidden transition-all duration-300 ${isDescriptionExpanded ? "" : "max-h-[21em]"}`}
                  dangerouslySetInnerHTML={{ __html: business.description }}
                />
                {!isDescriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="w-full py-2 rounded-lg border border-border bg-muted/50 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                {isDescriptionExpanded ? "Voir −" : "Voir +"}
              </button>
            </>
          )}

          {/* Contact info */}
          <div className="space-y-2">
            {business.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-gold transition-colors">
                <Phone className="h-4 w-4 shrink-0" />
                {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:text-emerald-500 transition-colors">
                <WhatsAppIcon />
                WhatsApp
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-gold transition-colors">
                <Mail className="h-4 w-4 shrink-0" />
                {business.email}
              </a>
            )}
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:text-gold transition-colors">
                <Globe className="h-4 w-4 shrink-0" />
                {business.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            )}
          </div>

          {/* Review sources */}
          {reviews.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
              <div className="flex flex-wrap gap-3">
                {reviews.map(r => (
                  <div key={r.label} className="flex items-center gap-1.5 text-sm">
                    <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                    <span className="font-medium text-foreground">{r.rating}/5</span>
                    <span className="text-muted-foreground">({r.count}) {r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {business.services && business.services.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Services</p>
              <div className="flex flex-wrap gap-1.5">
                {business.services.slice(0, 12).map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gold/10 text-gold border border-gold/20">
                    {s}
                  </span>
                ))}
                {business.services.length > 12 && (
                  <span className="px-2 py-0.5 text-xs text-muted-foreground">+{business.services.length - 12}</span>
                )}
              </div>
            </div>
          )}

          {/* Booking / Reserve */}
          {(business.booking_url || business.reserve_now_url) && (
            <div className="flex gap-2">
              {business.reserve_now_url && (
                <a
                  href={business.reserve_now_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 rounded-xl bg-gold text-gold-foreground font-semibold text-sm hover:bg-gold/90 transition-colors"
                >
                  Réserver
                </a>
              )}
              {business.booking_url && (
                <a
                  href={business.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 rounded-xl border border-gold text-gold font-semibold text-sm hover:bg-gold/10 transition-colors"
                >
                  Booking
                </a>
              )}
            </div>
          )}

          {/* CTA to full page */}
          <Link
            to={`/business/${business.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Voir la fiche complète
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {isLightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setIsLightboxOpen(false)}>
          <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={images[currentImageIndex]}
            alt={`${business.name} - ${currentImageIndex + 1}`}
            className="max-w-[90%] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === 0 ? images.length - 1 : i - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => i === images.length - 1 ? 0 : i + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-sm text-white">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessSlidePanel;
