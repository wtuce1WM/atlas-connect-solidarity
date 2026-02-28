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
  twitter_url: string | null;
  pinterest_url: string | null;
  vimeo_url: string | null;
  skype: string | null;
  airbnb_url: string | null;
  hotels_com_url: string | null;
  trivago_url: string | null;
  glovo_url: string | null;
  getyourguide_url: string | null;
  viator_url: string | null;
  other_booking_name: string | null;
  other_booking_url: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SkypeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#00AFF0">
    <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882a7.508 7.508 0 01.12 1.357c0 4.456-4.214 8.07-9.413 8.07a9.643 9.643 0 01-2.987-.463 5.56 5.56 0 01-2.559.631c-3.024 0-5.478-2.455-5.478-5.478 0-.957.245-1.878.681-2.683a8.4 8.4 0 01-.152-1.603c0-4.456 4.214-8.07 9.413-8.07.967 0 1.914.122 2.816.353A5.478 5.478 0 0120.593 5c3.024 0 5.478 2.455 5.478 5.478a5.48 5.48 0 01-.918 3.514"/>
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

  // Opening hours — same logic as BusinessCard badge
  const canShowOpenBadge = !!business.show_opening_hours || !!business.is_open_24h;
  let openBadgeText: string | null = null;
  let openBadgeIsOpen = false;

  if (canShowOpenBadge) {
    if (business.is_open_24h) {
      openBadgeText = "Ouvert 24h";
      openBadgeIsOpen = true;
    } else if (business.opening_hours) {
      const oh = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }>;
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const now = new Date();
      const todayKey = days[now.getDay()];

      // Check if currently open
      const currentlyOpen = isCurrentlyOpenCheck(oh[todayKey]);
      if (currentlyOpen) {
        openBadgeText = "Ouvert";
        openBadgeIsOpen = true;
      } else {
        // Find next opening time
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const dh = oh[todayKey];
        let foundToday = false;

        if (dh && !dh.closed && dh.open) {
          const [oH, oM] = dh.open.split(":").map(Number);
          const openMin = oH * 60 + (oM || 0);
          if (openMin > nowMin) {
            openBadgeText = `Ouvre à ${dh.open}`;
            foundToday = true;
          } else if (dh.open2 && !dh.continuous) {
            const [oH2, oM2] = dh.open2.split(":").map(Number);
            const open2Min = oH2 * 60 + (oM2 || 0);
            if (open2Min > nowMin) {
              openBadgeText = `Ouvre à ${dh.open2}`;
              foundToday = true;
            }
          }
        }

        if (!foundToday) {
          for (let i = 1; i <= 7; i++) {
            const nextDayKey = days[(now.getDay() + i) % 7];
            const nextDh = oh[nextDayKey];
            if (nextDh && !nextDh.closed && nextDh.open) {
              openBadgeText = `Ouvre à ${nextDh.open}`;
              break;
            }
          }
        }
      }
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
          {openBadgeText && (
            <div className={`flex items-center gap-2 text-sm font-medium ${openBadgeIsOpen ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Clock className="h-4 w-4" />
              {openBadgeText}
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
          <div className="border-y border-border py-5">
            <div className="grid grid-cols-2 gap-6">
              {/* Address */}
              {business.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Adresse</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{business.address}</p>
                    {business.city && <p className="text-sm text-muted-foreground">{business.city}</p>}
                  </div>
                </div>
              )}


              {/* Phone */}
              {business.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Téléphone</p>
                    <a href={`tel:${business.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {business.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Email</p>
                    <a href={`mailto:${business.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.email}
                    </a>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {business.whatsapp && (
                <div className="flex items-start gap-3">
                  <WhatsAppIcon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#25D366" }}>WhatsApp</p>
                    <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.whatsapp}
                    </a>
                  </div>
                </div>
              )}

              {/* Skype */}
              {business.skype && (
                <div className="flex items-start gap-3">
                  <SkypeIcon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#00AFF0" }}>Skype</p>
                    <a href={`skype:${business.skype}?chat`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block">
                      {business.skype}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social & Booking — single row */}
          {(() => {
            const socials = [
              { url: business.facebook_url, label: "Facebook", color: "#1877F2", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { url: business.instagram_url, label: "Instagram", color: "#E4405F", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg> },
              { url: business.linkedin_url, label: "LinkedIn", color: "#0A66C2", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
              { url: business.youtube_url, label: "YouTube", color: "#FF0000", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              { url: business.tiktok_url, label: "TikTok", color: "#000000", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
              { url: business.twitter_url, label: "X", color: "#000000", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              { url: business.pinterest_url, label: "Pinterest", color: "#E60023", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg> },
            ].filter(s => s.url);

            const platforms = [
              { url: business.booking_url, label: "Booking.com", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#003580"><path d="M2.732 0A2.732 2.732 0 000 2.732v18.536A2.732 2.732 0 002.732 24h18.536A2.732 2.732 0 0024 21.268V2.732A2.732 2.732 0 0021.268 0zm7.477 5.63h3.428c2.57 0 4.152 1.214 4.152 3.263 0 1.253-.678 2.274-1.904 2.763v.063c1.58.32 2.457 1.467 2.457 2.92 0 2.322-1.741 3.732-4.593 3.732H10.21zm2.488 2.088v2.763h.878c1.106 0 1.71-.488 1.71-1.382 0-.893-.604-1.381-1.71-1.381zm0 4.788v3.012h1.066c1.169 0 1.804-.552 1.804-1.506s-.635-1.506-1.804-1.506z"/></svg> },
              { url: business.airbnb_url, label: "Airbnb", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FF5A5F"><path d="M12.001 18.275c-1.353-1.697-2.148-3.398-2.488-4.736-.404-1.618-.18-2.835.564-3.54.477-.452 1.102-.66 1.753-.66h.34c.652 0 1.277.208 1.754.66.744.705.968 1.922.564 3.54-.34 1.338-1.135 3.04-2.487 4.736zm9.394-1.142c-.273 1.787-1.658 3.252-3.472 3.716-.603.155-1.224.224-1.841.224-1.17 0-2.305-.31-3.33-.82a14.37 14.37 0 01-.752-.423c-.23.293-.477.578-.735.853a8.04 8.04 0 01-2.73 2.034c-1.03.51-2.164.82-3.334.82-.617 0-1.238-.069-1.841-.224-1.814-.464-3.199-1.929-3.472-3.716-.211-1.395.07-2.844.815-4.293.512-1.003 1.232-2.01 2.134-2.994a26.478 26.478 0 011.676-1.69c.086-.08.17-.158.256-.234-.02-.07-.036-.14-.053-.211-.3-1.28-.292-2.47.078-3.514C5.685 3.24 6.605 2.496 7.79 2.15c.39-.114.808-.174 1.245-.174 1.352 0 2.834.67 4.407 2.004l.559.485.56-.485C16.153 2.646 17.635 1.976 18.987 1.976c.437 0 .854.06 1.245.174 1.184.346 2.104 1.09 2.594 2.097.37 1.043.378 2.234.077 3.514-.016.071-.033.141-.052.211.085.076.17.155.255.234a26.478 26.478 0 011.677 1.69c.902.985 1.622 1.991 2.134 2.994.745 1.449 1.026 2.898.815 4.293z"/></svg> },
              { url: business.hotels_com_url, label: "Hotels.com", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#D32F2F"><rect width="24" height="24" rx="4" fill="#D32F2F"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">H</text></svg> },
              { url: business.trivago_url, label: "Trivago", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#007FAD"><rect width="24" height="24" rx="4" fill="#007FAD"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">T</text></svg> },
              { url: business.glovo_url, label: "Glovo", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FFC244"><circle cx="12" cy="12" r="12" fill="#FFC244"/><text x="12" y="16" textAnchor="middle" fill="#1A1A1A" fontSize="10" fontWeight="bold">G</text></svg> },
              { url: business.getyourguide_url, label: "GetYourGuide", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FF4E00"><rect width="24" height="24" rx="4" fill="#FF4E00"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">G</text></svg> },
              { url: business.viator_url, label: "Viator", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#3B7D23"><rect width="24" height="24" rx="4" fill="#3B7D23"/><text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">V</text></svg> },
              { url: business.reserve_now_url, label: "Réserver", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { url: business.other_booking_url, label: business.other_booking_name || "Autre", icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
            ].filter(p => p.url);

            if (socials.length === 0 && platforms.length === 0) return null;

            return (
              <div className="space-y-4">
                {socials.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Réseaux sociaux</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {socials.map(s => (
                        <a key={s.label} href={s.url!} target="_blank" rel="noopener noreferrer" title={s.label} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" style={{ color: s.color }}>
                          {s.icon}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {platforms.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plateformes de réservation</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {platforms.map(p => (
                        <a key={p.label} href={p.url!} target="_blank" rel="noopener noreferrer" title={p.label} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                          {p.icon}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
