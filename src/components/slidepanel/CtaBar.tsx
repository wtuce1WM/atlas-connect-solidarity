import React from "react";
import { ExternalLink, MapPin, CalendarCheck, ShoppingBag } from "lucide-react";
import VideoControls from "@/components/VideoControls";
import { OwnerLogoOverlay, OwnerBadge } from "@/components/CardsVisibilityToggle";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import AppStoreCard from "@/components/cards/AppStoreCard";
import { whatsappUrl } from "@/lib/phoneUtils";

export const CTA_MODE_LABELS: Record<string, { fr: string; en: string }> = {
  acheter_en_ligne: { fr: 'Acheter en ligne', en: 'Shop Online' },
  reserver_en_ligne: { fr: 'Réserver en ligne', en: 'Book Online' },
  consulter_offre: { fr: 'Consulter notre offre', en: 'View Our Offer' },
  plus_informations: { fr: "Plus d'informations", en: 'More Information' },
  contactez_nous: { fr: 'Contactez nous', en: 'Contact Us' },
  la_carte: { fr: 'La carte', en: 'The Menu' },
  les_boissons: { fr: 'Les boissons', en: 'Drinks' },
  seances: { fr: 'Séances', en: 'Sessions' },
  billetterie: { fr: 'Billetterie', en: 'Tickets' },
  application: { fr: 'Application', en: 'Application' },
  app_store: { fr: 'App Store', en: 'App Store' },
  google_play: { fr: 'Google Play', en: 'Google Play' },
  programme: { fr: 'Programme', en: 'Program' },
  en_savoir_plus: { fr: 'En savoir +', en: 'Learn More' },
  accreditations: { fr: 'Accréditations', en: 'Accreditations' },
  whatsapp: { fr: 'WhatsApp', en: 'WhatsApp' },
};

interface CtaBarProps {
  business: any;
  language: string;
  cardsHidden: boolean;
  showSearchBar?: boolean;
  showGoogleMap: boolean;
  externalVideoInteractiveMode: boolean;
  effectiveMedia: any;
  bookingCta: { fullUrl: string; forceExternal?: boolean } | null;
  shopCta: { fullUrl: string; forceExternal?: boolean } | null;
  url4Cta?: { fullUrl: string; forceExternal?: boolean } | null;
  url5Cta?: { fullUrl: string; forceExternal?: boolean } | null;
  bookingCtaLabel: string;
  shopCtaLabel: string;
  url4CtaLabel?: string;
  url5CtaLabel?: string;
  appStoreLinks?: { type: "app_store" | "google_play"; url: string }[];
  fallbackPanelData: any;
  // Logo overlay
  logoBigOverlay: any;
  logoBigFadingOut: boolean;
  currentMediaIndex: number;
  videoDocs: any[];
  businessId: string;
  currentMediaUrl?: string;
  currentMediaKind?: string;
  // Video controls
  videoInfo: any;
  videoRef: React.RefObject<HTMLVideoElement>;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  videoPaused: boolean;
  videoMuted: boolean;
  ytBgPlaying: boolean;
  ytBgMuted: boolean;
  setYtBgPlaying: (v: boolean) => void;
  setYtBgMuted: (v: boolean) => void;
  // Actions
  setShowDirections: (v: boolean) => void;
  setShowBookingOverlay: (v: boolean) => void;
  setBookingOverlayLoaded: (v: boolean) => void;
  setBookingOverlayUrl: (v: string | null) => void;
  setBookingOverlayTitle: (v: string | undefined) => void;
  setActiveBusinessId: (id: string) => void;
  /** Skip rendering the play/mute VideoControls (they may be rendered elsewhere, e.g. in PanelSearchBar) */
  hideVideoControls?: boolean;
}

export function CtaBar({
  business,
  language,
  cardsHidden,
  showSearchBar,
  showGoogleMap,
  externalVideoInteractiveMode,
  effectiveMedia,
  bookingCta,
  shopCta,
  url4Cta,
  url5Cta,
  bookingCtaLabel,
  shopCtaLabel,
  url4CtaLabel,
  url5CtaLabel,
  appStoreLinks,
  fallbackPanelData,
  logoBigOverlay,
  logoBigFadingOut,
  currentMediaIndex,
  videoDocs,
  businessId,
  currentMediaUrl,
  currentMediaKind,
  videoInfo,
  videoRef,
  iframeRef,
  videoPaused,
  videoMuted,
  ytBgPlaying,
  ytBgMuted,
  setYtBgPlaying,
  setYtBgMuted,
  setShowDirections,
  setShowBookingOverlay,
  setBookingOverlayLoaded,
  setBookingOverlayUrl,
  setBookingOverlayTitle,
  setActiveBusinessId,
  hideVideoControls,
}: CtaBarProps) {
  const hasBottomActionCtas = (!cardsHidden && (!!bookingCta || !!shopCta || !!url4Cta || !!url5Cta)) || (!cardsHidden && showGoogleMap && business?.latitude && business?.longitude);

  // Hide when cards hidden + availability confirmed
  const hideStyle = (cardsHidden && fallbackPanelData && (() => {
    const ch = fallbackPanelData.hotels.find((h: any) => h.isCurrentHotel);
    return !!ch;
  })()) ? { display: 'none' as const } : undefined;

  const isWhatsAppCta = (label: string) => label.toLowerCase().replace(/[\s_-]/g, '') === 'whatsapp';

  // Liquid glass effect — inner highlights + soft gradient overlays. Keeps the underlying background color.
  const glassFx =
    "relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.28)] " +
    "before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-white/5 " +
    "after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-t-[inherit] after:pointer-events-none after:bg-gradient-to-b after:from-white/25 after:to-transparent after:blur-[1px] " +
    "[&>*]:relative [&>*]:z-10";

  const ctaItems: React.ReactNode[] = [];

  if (bookingCta && !cardsHidden) {
    if (isWhatsAppCta(bookingCtaLabel) && business?.whatsapp) {
      ctaItems.push(
        <a key="booking" href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left ${glassFx}`}
          style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
          <WhatsAppIcon className="h-4 w-4" />
          <span className="truncate">WhatsApp</span>
        </a>
      );
    } else {
      ctaItems.push(
        bookingCta.forceExternal ? (
          <a key="booking" href={bookingCta.fullUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-left ${glassFx}`}
            style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
            <CalendarCheck className="h-4 w-4 hidden md:block" />
            <span className="truncate">{bookingCtaLabel}</span>
            <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
          </a>
        ) : (
          <button key="booking"
            onClick={() => { setBookingOverlayLoaded(false); setBookingOverlayUrl(null); setBookingOverlayTitle(undefined); setShowBookingOverlay(true); }}
            className={`flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left ${glassFx}`}
            style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
            <CalendarCheck className="h-4 w-4 hidden md:block" />
            <span className="truncate">{bookingCtaLabel}</span>
          </button>
        )
      );
    }
  }

  if (shopCta && !cardsHidden) {
    if (isWhatsAppCta(shopCtaLabel) && business?.whatsapp) {
      ctaItems.push(
        <a key="shop" href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left ${glassFx}`}
          style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
          <WhatsAppIcon className="h-4 w-4" />
          <span className="truncate">WhatsApp</span>
        </a>
      );
    } else {
      ctaItems.push(
        shopCta.forceExternal ? (
          <a key="shop" href={shopCta.fullUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
            <ShoppingBag className="h-4 w-4 hidden md:block" />
            <span className="truncate">{shopCtaLabel}</span>
            <ExternalLink className="h-3.5 w-3.5 ml-0.5 shrink-0 hidden md:block" />
          </a>
        ) : (
          <button key="shop"
            onClick={() => { setBookingOverlayLoaded(false); setBookingOverlayUrl(shopCta.fullUrl); setBookingOverlayTitle(shopCtaLabel); setShowBookingOverlay(true); }}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
            <ShoppingBag className="h-4 w-4 hidden md:block" />
            <span className="truncate">{shopCtaLabel}</span>
          </button>
        )
      );
    }
  }

  // URL 4 CTA
  if (url4Cta && !cardsHidden) {
    const label = url4CtaLabel || 'URL 4';
    if (isWhatsAppCta(label) && business?.whatsapp) {
      ctaItems.push(
        <a key="url4" href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left"
          style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
          <WhatsAppIcon className="h-4 w-4" />
          <span className="truncate">WhatsApp</span>
        </a>
      );
    } else {
      ctaItems.push(
        url4Cta.forceExternal ? (
          <a key="url4" href={url4Cta.fullUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
            <ExternalLink className="h-4 w-4 hidden md:block" />
            <span className="truncate">{label}</span>
          </a>
        ) : (
          <button key="url4"
            onClick={() => { setBookingOverlayLoaded(false); setBookingOverlayUrl(url4Cta.fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
            <span className="truncate">{label}</span>
          </button>
        )
      );
    }
  }

  // URL 5 CTA
  if (url5Cta && !cardsHidden) {
    const label = url5CtaLabel || 'URL 5';
    if (isWhatsAppCta(label) && business?.whatsapp) {
      ctaItems.push(
        <a key="url5" href={whatsappUrl(business.whatsapp)} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left"
          style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
          <WhatsAppIcon className="h-4 w-4" />
          <span className="truncate">WhatsApp</span>
        </a>
      );
    } else {
      ctaItems.push(
        url5Cta.forceExternal ? (
          <a key="url5" href={url5Cta.fullUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-white text-black font-medium text-xs md:text-sm shadow-lg hover:bg-white/90 transition-colors [&_*]:text-black normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}>
            <ExternalLink className="h-4 w-4 hidden md:block" />
            <span className="truncate">{label}</span>
          </a>
        ) : (
          <button key="url5"
            onClick={() => { setBookingOverlayLoaded(false); setBookingOverlayUrl(url5Cta.fullUrl); setBookingOverlayTitle(label); setShowBookingOverlay(true); }}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg font-medium text-xs md:text-sm shadow-lg hover:opacity-90 transition-opacity text-white normal-case tracking-normal animate-slide-in-left"
            style={{ fontFamily: "'Josefin Sans', sans-serif", backgroundColor: '#25D366', height: '40px' }}>
            <span className="truncate">{label}</span>
          </button>
        )
      );
    }
  }
  if (!cardsHidden && showGoogleMap && business.latitude && business.longitude) {
    ctaItems.push(
      <button
        key="directions"
        onClick={() => setShowDirections(true)}
        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gold text-gold-foreground font-medium text-xs md:text-sm shadow-lg hover:bg-gold/90 transition-colors normal-case tracking-normal animate-slide-in-left"
        style={{ fontFamily: "'Josefin Sans', sans-serif", height: '40px' }}
      >
        <MapPin className="h-4 w-4 hidden md:block" />
        <span className="truncate">{language === "en" ? "Directions" : "Itinéraire"}</span>
      </button>
    );
  }
  return (
    <div
      className={`${cardsHidden && showSearchBar ? 'absolute bottom-[56px] left-0 right-0 z-[74] pb-[14px] md:pb-[10px]' : 'shrink-0 py-2 lg:pb-2'} flex flex-col items-center gap-2 ${externalVideoInteractiveMode ? 'pointer-events-none' : 'pointer-events-auto'} ${cardsHidden && effectiveMedia?.kind === "matterport" ? 'mb-24' : ''}`}
      style={hideStyle}
    >
      {!cardsHidden && appStoreLinks && appStoreLinks.length > 0 && (
        <div className="pointer-events-auto">
          <AppStoreCard links={appStoreLinks} />
        </div>
      )}
      {ctaItems.length > 0 && (
        ctaItems.length === 5 ? (
          <div className="w-full px-2 md:w-3/4 md:px-0 pointer-events-auto flex flex-col gap-2">
            <div className="flex justify-center gap-1.5 md:gap-2">
              {ctaItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex-1">{item}</div>
              ))}
            </div>
            <div className="flex justify-center gap-1.5 md:gap-2">
              {ctaItems.slice(3).map((item, i) => (
                <div key={i + 3} className="flex-1">{item}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${ctaItems.length === 1 ? 'w-1/2' : ctaItems.length === 2 || ctaItems.length === 3 ? 'w-[95%]' : 'w-4/5'} md:w-3/4 md:px-0 pointer-events-auto ${ctaItems.length === 4 ? 'grid grid-cols-2 gap-2' : 'flex justify-center gap-2'}`}>
            {ctaItems.map((item, i) => (
              <div key={i} className={ctaItems.length === 4 ? '' : 'flex-1 md:flex-none md:w-1/3'}>{item}</div>
            ))}
          </div>
        )
      )}

      {/* Owner logo + badge */}
      <OwnerLogoOverlay
        key={`logo-${currentMediaIndex}`}
        logoBigOverlay={logoBigOverlay}
        logoBigFadingOut={logoBigFadingOut}
        cardsHidden={cardsHidden}
        currentMediaUrl={currentMediaUrl}
        videoDocs={videoDocs}
        currentBusinessId={businessId}
      />
      <OwnerBadge
        key={`badge-${currentMediaIndex}`}
        cardsHidden={cardsHidden}
        currentMediaKind={currentMediaKind}
        currentMediaUrl={currentMediaUrl}
        videoDocs={videoDocs}
        currentBusinessId={businessId}
        onNavigateToOwner={setActiveBusinessId}
      />

      {/* Video controls */}
      {!hideVideoControls && effectiveMedia?.kind === "video" && videoInfo?.type === "file" && (
        <VideoControls type="file" videoRef={videoRef as React.RefObject<HTMLVideoElement>} paused={videoPaused} muted={videoMuted} className="mt-2 md:mt-3 animate-slide-in-right" />
      )}
      {!hideVideoControls && effectiveMedia?.kind === "video" && videoInfo?.type === "youtube" && !cardsHidden && (
        <VideoControls type="youtube" iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>} playing={ytBgPlaying} muted={ytBgMuted} onPlayingChange={setYtBgPlaying} onMutedChange={setYtBgMuted} className="mt-2 md:mt-3 animate-slide-in-right" />
      )}
    </div>
  );
}
