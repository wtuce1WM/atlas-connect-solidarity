import { useState, useCallback, useEffect } from "react";
import { trackBusinessImpression } from "@/lib/businessAnalytics";
import { businessUrl } from "@/lib/businessUrl";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ShieldCheck, Star, Globe, Clock, Headphones, Loader2, Leaf, Truck, Accessibility, Award } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";
import logoGold from "@/assets/logoGOLDsimple.webp";

import { cleanPhone, whatsappUrl } from "@/lib/phoneUtils";
import { isOpenDuringSlot, getOpeningTimeForSlot, type TimeSlot } from "@/lib/timeSlots";
import { isCurrentlyOpen, type DayHoursData } from "@/lib/formatOpeningHours";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessCardData {
  id: string;
  name: string;
  city: string;
  region: string;
  address?: string | null;
  phone: string | null;
  whatsapp: string | null;
  skype: string | null;
  neighborhood?: string | null;
  logo_url: string | null;
  hook_fr?: string | null;
  images: string[] | null;
  website?: string | null;
  categories: string[] | null;
  default_service?: string | null;
  wtuce_status: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  computed_rating?: number | null;
  total_review_count?: number | null;
  gamme_id: string | null;
  badge_id?: string | null;
  opening_hours?: Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }> | unknown;
  is_open_24h?: boolean | null;
  show_opening_hours?: boolean | null;
  vacation_dates?: unknown;
  engagements?: string[];
  online_shop_url?: string | null;
}

export interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
  sort_order: number | null;
}

export interface Badge {
  id: string;
  name_fr: string;
  color_hex: string | null;
  text_color_hex: string | null;
}

export interface SubcategoryRef {
  id: string;
  name_fr: string;
  sort_order?: number | null;
  show_google_map?: boolean;
}

export interface BadgeSubcategoryRef {
  badge_id: string;
  subcategory_id: string;
}

interface BusinessCardProps {
  business: BusinessCardData;
  gammes: Gamme[];
  badges?: Badge[];
  subcategories?: SubcategoryRef[];
  badgeSubcategories?: BadgeSubcategoryRef[];
  verifiedLabel: string;
  selectedBusinessId?: string | null;
  onSelectBusiness?: (business: BusinessCardData) => void;
  showMapButton?: boolean;
  mapButtonLabels?: {
    view: string;
    shown: string;
  };
  mapButtonVariant?: "text" | "button";
  showAddress?: boolean;
  distanceKm?: number | null;
  activeTimeSlot?: TimeSlot | null;
}

const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SkypeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#00AFF0">
    <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882l-.029.135-.044-.24c.015.045.044.074.059.12.12-.675.181-1.363.181-2.052 0-1.529-.301-3.012-.898-4.42-.569-1.348-1.395-2.562-2.427-3.596-1.049-1.033-2.247-1.856-3.595-2.426-1.318-.631-2.801-.93-4.328-.93-.72 0-1.444.07-2.143.204l.119.06-.239-.033.119-.025C8.91.274 7.829 0 6.731 0c-1.789 0-3.47.698-4.736 1.967C.729 3.235.032 4.923.032 6.716c0 1.143.292 2.265.844 3.258l.02-.124.041.239-.06-.115c-.114.645-.172 1.299-.172 1.955 0 1.53.3 3.017.884 4.416.568 1.362 1.378 2.576 2.427 3.609a11.92 11.92 0 003.58 2.442c1.404.6 2.886.93 4.404.93.599 0 1.229-.06 1.868-.172l-.119-.062.239.033-.119.024c1.002.569 2.126.871 3.294.871 1.783 0 3.459-.69 4.733-1.963 1.259-1.259 1.962-2.951 1.962-4.749 0-1.138-.299-2.262-.853-3.266"/>
  </svg>
);

const getBusinessImage = (business: BusinessCardData): { src: string; isLogo: boolean } => {
  if (business.images && business.images.length > 0) return { src: business.images[0], isLogo: false };
  if (business.logo_url) return { src: business.logo_url, isLogo: true };
  return { src: "/placeholder.svg", isLogo: false };
};

const getBusinessGamme = (business: BusinessCardData, gammes: Gamme[]): Gamme | null => {
  if (!business.gamme_id) return null;
  return gammes.find(g => g.id === business.gamme_id) || null;
};

const getBusinessBadge = (
  business: BusinessCardData,
  badges: Badge[],
  subcategories?: SubcategoryRef[],
  badgeSubcategories?: BadgeSubcategoryRef[]
): Badge | null => {
  // Priority 1: direct badge_id
  if (business.badge_id) {
    return badges.find(b => b.id === business.badge_id) || null;
  }
  // Priority 2: resolve via badge_subcategories from business categories
  if (subcategories && badgeSubcategories && business.categories && business.categories.length > 0) {
    const matchingSubcatIds = subcategories
      .filter(s => business.categories!.includes(s.name_fr))
      .map(s => s.id);
    if (matchingSubcatIds.length > 0) {
      const matchingBadgeId = badgeSubcategories.find(bs => matchingSubcatIds.includes(bs.subcategory_id))?.badge_id;
      if (matchingBadgeId) {
        return badges.find(b => b.id === matchingBadgeId) || null;
      }
    }
  }
  return null;
};

const getDisplayRating = (business: BusinessCardData): number | null => {
  return business.computed_rating ?? business.rating ?? null;
};

const getDisplayReviewCount = (business: BusinessCardData): number => {
  return business.total_review_count ?? 0;
};

const BusinessCard = ({
  business,
  gammes,
  badges = [],
  subcategories,
  badgeSubcategories,
  verifiedLabel,
  selectedBusinessId,
  onSelectBusiness,
  showMapButton = false,
  mapButtonLabels = { view: "Voir sur la carte", shown: "Affiché sur la carte" },
  mapButtonVariant = "text",
  showAddress = false,
  distanceKm,
  activeTimeSlot
}: BusinessCardProps) => {
  const { language } = useLanguage();
  useEffect(() => { trackBusinessImpression(business.id, "list"); }, [business.id]);
  const { speak: ttsSpeak, stop: ttsStop, status: ttsStatus } = useTextToSpeech();
  const gamme = getBusinessGamme(business, gammes);
  const badge = getBusinessBadge(business, badges, subcategories, badgeSubcategories);
  const displayRating = getDisplayRating(business);
  const totalReviews = getDisplayReviewCount(business);
  const isSelected = selectedBusinessId === business.id;
  const hasMapData = business.google_maps_url || (business.latitude && business.longitude);
  const hasEngagement = (target: string) =>
    (business.engagements || []).some((entry) => {
      const normalized = entry.toLowerCase().trim();
      const needle = target.toLowerCase();
      return normalized === needle || normalized === `logistique:${needle}` || normalized.endsWith(`:${needle}`);
    });

  const webOnlyUrl = business.online_shop_url || business.website || null;
  const isWebOnly = !!(
    hasEngagement("Commandez en ligne et recevez votre colis chez vous") &&
    webOnlyUrl
  );
  const businessImage = getBusinessImage(business);

  const buildCardSynthesis = useCallback(async () => {
    // Fetch description + ai_review_summary from DB
    const { data } = await supabase
      .from("businesses")
      .select("description, description_fr, description_en, description_ar, ai_review_summary")
      .eq("id", business.id)
      .single();

    const parts: string[] = [];
    parts.push(`${business.name}, situé à ${business.city}${business.neighborhood ? `, quartier ${business.neighborhood}` : ""}.`);
    if (business.default_service) {
      parts.push(`Leur spécialité : ${business.default_service}.`);
    }

    // Description nettoyée (localisée)
    const d: any = data || {};
    const localizedDesc = language === "ar" ? (d.description_ar || d.description_fr || d.description)
      : language === "en" ? (d.description_en || d.description_fr || d.description)
      : (d.description_fr || d.description);
    if (localizedDesc) {
      const clean = localizedDesc.replace(/<[^>]+>/g, "").trim();
      if (clean.length > 0) {
        // Limiter à ~200 caractères pour rester dans les 30s
        parts.push(clean.length > 200 ? clean.slice(0, 200) + "…" : clean);
      }
    }

    // Synthèse des avis (multilingual: picks fr/en based on interface language)
    const rawSummary = data?.ai_review_summary as any;
    const langSummary = rawSummary?.[language] || rawSummary; // fallback to legacy top-level
    const prosLabel = language === "en" ? "Customers appreciate" : "Les clients apprécient";
    const consLabel = language === "en" ? "Areas for improvement" : "Points à améliorer";
    if (langSummary?.pros && langSummary.pros.length > 0) {
      parts.push(`${prosLabel} : ${langSummary.pros.slice(0, 3).join(", ")}.`);
    }
    if (langSummary?.cons && langSummary.cons.length > 0) {
      parts.push(`${consLabel} : ${langSummary.cons.slice(0, 2).join(", ")}.`);
    }

    if (displayRating) {
      parts.push(`Note globale : ${displayRating} sur 20, basée sur ${totalReviews} avis.`);
    }
    return parts.join(" ");
  }, [business, displayRating, totalReviews]);

  // Normalize French day keys to English
  const frToEn: Record<string, string> = {
    lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
    vendredi: "friday", samedi: "saturday", dimanche: "sunday",
  };
  const rawOH = (business.opening_hours as Record<string, DayHoursData>) || null;
  const openingHoursTyped = rawOH ? Object.entries(rawOH).reduce((acc, [k, v]) => {
    acc[frToEn[k] || k] = v;
    return acc;
  }, {} as Record<string, DayHoursData>) : null;
  const vacationDatesTyped = Array.isArray(business.vacation_dates) ? business.vacation_dates as Array<{ start_date: string; end_date: string }> : null;

  // Only show open badge if show_opening_hours is enabled (or is_open_24h)
  const canShowOpenBadge = !!business.show_opening_hours || !!business.is_open_24h;

  // Check real-time open status
  const isCurrentlyOpenNow = canShowOpenBadge && (
    !!business.is_open_24h || (() => {
      if (!openingHoursTyped) return false;
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = days[new Date().getDay()];
      return isCurrentlyOpen(openingHoursTyped[today]);
    })()
  );

  // Determine badge text and visibility
  let openBadgeText: string | null = null;
  if (canShowOpenBadge) {
    if (isCurrentlyOpenNow) {
      openBadgeText = business.is_open_24h ? "Ouvert 24h" : "Ouvert";
    } else if (openingHoursTyped) {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const todayKey = days[now.getDay()];
      const dh = openingHoursTyped[todayKey];

      // Try to find next opening time today
      let foundToday = false;
      if (dh && !dh.closed && dh.open) {
        const [oh, om] = dh.open.split(":").map(Number);
        const openMin = oh * 60 + (om || 0);
        if (openMin > nowMin) {
          openBadgeText = `Ouvre à ${dh.open}`;
          foundToday = true;
        } else if (dh.open2 && dh.close2 && !dh.continuous) {
          const [oh2, om2] = dh.open2.split(":").map(Number);
          const open2Min = oh2 * 60 + (om2 || 0);
          if (open2Min > nowMin) {
            openBadgeText = `Ouvre à ${dh.open2}`;
            foundToday = true;
          }
        }
      }

      // If nothing found today, show next day's opening time with day name
      if (!foundToday) {
        const dayLabels = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
        for (let i = 1; i <= 7; i++) {
          const idx = (now.getDay() + i) % 7;
          const nextDayKey = days[idx];
          const nextDh = openingHoursTyped[nextDayKey];
          if (nextDh && !nextDh.closed && nextDh.open) {
            openBadgeText = `Ouvre ${dayLabels[idx]} à ${nextDh.open}`;
            break;
          }
        }
      }
    }
  }

  const hasLocation = business.city || business.neighborhood || business.region;
  const locationText = hasLocation
    ? showAddress && business.address
      ? business.address
      : business.neighborhood
        ? `${business.city}, ${business.neighborhood}`
        : `${business.city}, ${business.region}`
    : null;

  return (
    <Link to={businessUrl(business)}>
      <Card className="group h-full overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 relative">
        {/* Image - 16:9 aspect ratio */}
        <div className={`aspect-video overflow-hidden relative ${businessImage.isLogo ? 'bg-white' : 'bg-muted'}`}>
          <img
            src={businessImage.src}
            alt={business.name}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${businessImage.isLogo ? 'object-contain p-4' : 'object-cover'}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          {/* Gamme badge - top center (désactivé temporairement)
          {gamme && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
              <Badge 
                className="text-xs border border-black whitespace-nowrap"
                style={{ backgroundColor: gamme.color_hex || '#666666', color: gamme.text_color_hex || '#000000' }}
              >
                {gamme.name_fr}
              </Badge>
            </div>
          )}
          */}
          {/* Watermark logo removed — now using CSS 3D spin in CardContent */}
          {/* Open status badge */}
          {openBadgeText && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${
                openBadgeText === "Ouvert" || openBadgeText === "Ouvert 24h"
                  ? "bg-atlas/85 text-atlas-foreground border-foreground/70"
                  : "bg-black/85 text-white border-white/30"
              }`}>
                <Clock className="h-3 w-3" />
                {openBadgeText}
              </Badge>
            </div>
          )}
          {/* Hook overlay - bottom of image */}
          {business.hook_fr && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-4 pointer-events-none transition-all duration-300 group-hover:from-black/95 group-hover:via-black/60 group-hover:py-6">
              <p className="text-white text-lg group-hover:text-xl italic font-['Cormorant_Garamond'] line-clamp-2 group-hover:line-clamp-4 text-center leading-snug transition-all duration-300">
                {business.hook_fr}
              </p>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 relative overflow-hidden">
          {/* Badges + verified coin */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {business.categories && business.categories.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-gold text-gold-foreground">
                  {business.categories[0]}
                </Badge>
              )}
              {business.default_service && (
                <Badge variant="outline" className="text-xs bg-black text-white border-black">
                  {business.default_service}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (ttsStatus === "playing" || ttsStatus === "loading") {
                    ttsStop();
                  } else {
                    buildCardSynthesis().then(text => ttsSpeak(text));
                  }
                }}
                className={`p-1 rounded-full transition-colors ${ttsStatus === "playing" || ttsStatus === "loading" ? "bg-gold/20 text-gold" : "hover:bg-muted text-muted-foreground"}`}
                title={ttsStatus === "playing" ? "Arrêter" : "Écouter la synthèse"}
              >
                {ttsStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
              </button>
              {business.wtuce_status === "verified" && (
                <div className="overflow-hidden" style={{ width: 28, height: 28 }}>
                  <div className="[perspective:600px]" style={{ transformStyle: "preserve-3d" }}>
                    <img
                      src={logoGold}
                      alt=""
                      className="object-contain animate-[coinSpin_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                      style={{ width: 28, height: 28, transformStyle: "preserve-3d" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Name - selectable for copy-paste */}
          <h3
            className={`font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors select-text cursor-text ${business.wtuce_status === "verified" ? "text-foreground font-bold" : "text-foreground"}`}
            style={{ fontFamily: "'Montserrat', sans-serif", textTransform: "none", letterSpacing: "0.02em", fontWeight: 600 }}
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {business.name}
          </h3>

          {/* Rating & reviews */}
          {displayRating && (
            <div className="flex items-center gap-1.5 text-sm mb-2">
              <Star className="h-3.5 w-3.5 text-gold fill-gold flex-shrink-0" />
              <span className="font-semibold text-foreground">{displayRating}/20</span>
              {totalReviews > 0 && (
                <span className="text-muted-foreground text-xs">({totalReviews} avis)</span>
              )}
            </div>
          )}

          {locationText ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{locationText}</span>
              {distanceKm != null && (
                <span className="ml-auto text-xs text-primary font-medium whitespace-nowrap">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                </span>
              )}
            </div>
          ) : business.website ? (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-sm text-primary hover:underline mb-2"
            >
              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
            </a>
          ) : null}

          {/* Contact info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {business.phone && (
              <a
                href={`tel:${cleanPhone(business.phone)}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{business.phone}</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={whatsappUrl(business.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[#25D366] hover:opacity-80 transition-opacity"
                title="WhatsApp"
              >
                <WhatsAppIcon />
                <span className="text-[#25D366] font-bold">WhatsApp</span>
              </a>
            )}
            {business.skype && (
              <a
                href={`skype:${business.skype}?chat`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[#00AFF0] hover:opacity-80 transition-opacity"
                title="Skype"
              >
                <SkypeIcon />
                <span className="text-[#00AFF0] font-bold">Skype</span>
              </a>
            )}
          </div>

          {/* Engagements, Certifications & Logistics badges */}
          {business.engagements && business.engagements.length > 0 && (() => {
            const engagementItems = business.engagements.filter(e => !e.startsWith("Logistique:") && !e.startsWith("Certification:"));
            const certificationItems = business.engagements
              .filter(e => e.startsWith("Certification:"))
              .map(e => e.replace("Certification:", "").trim());
            const logisticsItems = business.engagements
              .filter(e => e.startsWith("Logistique:"))
              .map(e => e.replace("Logistique:", "").trim());
            if (engagementItems.length === 0 && logisticsItems.length === 0 && certificationItems.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {certificationItems.map((cert, i) => (
                  <Badge key={`cert-${i}`} variant="outline" className="text-[10px] gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    <Award className="h-3 w-3" />
                    {cert}
                  </Badge>
                ))}
                {engagementItems.map((eng, i) => (
                  <Badge key={`eng-${i}`} variant="outline" className="text-[10px] gap-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    <Leaf className="h-3 w-3" />
                    {eng}
                  </Badge>
                ))}
                {logisticsItems.map((item, i) => (
                  <Badge key={`log-${i}`} variant="outline" className="text-[10px] gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    {item.toLowerCase().includes("livraison") ? <Truck className="h-3 w-3" /> :
                     item.toLowerCase().includes("mobilité") || item.toLowerCase().includes("handicap") || item.toLowerCase().includes("accessible") ? <Accessibility className="h-3 w-3" /> :
                     <Truck className="h-3 w-3" />}
                    {item}
                  </Badge>
                ))}
              </div>
            );
          })()}

          {/* Map button + Rating row */}
          {(displayRating || (showMapButton && hasMapData && onSelectBusiness)) && (
            <div className="flex items-center justify-between mt-3">
              {showMapButton && hasMapData && onSelectBusiness ? (
                mapButtonVariant === "button" ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectBusiness(business);
                    }}
                    className={`text-xs py-1.5 px-2 rounded transition-colors flex items-center gap-1 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {isSelected ? mapButtonLabels.shown : mapButtonLabels.view}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectBusiness(business);
                    }}
                    className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                      isSelected
                        ? "text-gold"
                        : "text-muted-foreground hover:text-gold"
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {isSelected ? mapButtonLabels.shown : mapButtonLabels.view}
                  </button>
                )
              ) : <span />}
              {displayRating && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="text-gold font-semibold text-sm">{displayRating}/20</span>
                  {totalReviews > 0 && (
                    <span className="text-muted-foreground text-xs">({totalReviews} avis)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default BusinessCard;
