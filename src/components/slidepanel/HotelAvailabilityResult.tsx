import React from "react";
import { CalendarCheck, Loader2, MapPin } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import type { FallbackPanelData } from "@/components/HotelAvailabilityOverlay";
import { CTA_MODE_LABELS } from "./CtaBar";

interface HotelAvailabilityResultProps {
  business: any;
  language: string;
  cardsHidden: boolean;
  effectiveMedia: any;
  externalVideoInteractiveMode: boolean;
  hotelSearchLoading: boolean;
  fallbackPanelData: FallbackPanelData | null;
  showGoogleMap: boolean;
  showCards: () => void;
  setShowDirections: (v: boolean) => void;
  setShowFallbackOverlay: (v: boolean) => void;
  onClosePanel?: () => void;
  setShowBookingOverlay: (v: boolean) => void;
  setBookingOverlayLoaded: (v: boolean) => void;
  setBookingOverlayUrl: (v: string | null) => void;
  setBookingOverlayTitle: (v: string | undefined) => void;
}

export function HotelAvailabilityResult({
  business,
  language,
  cardsHidden,
  effectiveMedia,
  externalVideoInteractiveMode,
  hotelSearchLoading,
  fallbackPanelData,
  showGoogleMap,
  showCards,
  setShowDirections,
  setShowFallbackOverlay,
  onClosePanel,
  setShowBookingOverlay,
  setBookingOverlayLoaded,
  setBookingOverlayUrl,
  setBookingOverlayTitle,
}: HotelAvailabilityResultProps) {
  if (!cardsHidden) return null;

  return (
    <div className={`flex-1 w-full flex flex-col justify-start gap-3 px-0 md:px-8 pt-4 md:pt-8 overflow-y-auto ${effectiveMedia?.kind === "matterport" || externalVideoInteractiveMode ? "pointer-events-none" : "pointer-events-auto"}`}>
      {hotelSearchLoading && (
        <div className="flex items-center justify-center gap-2 text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-['Roboto',sans-serif]">{language === "en" ? "Searching availability..." : "Recherche de disponibilité..."}</span>
        </div>
      )}
      {fallbackPanelData && !hotelSearchLoading && (() => {
        const currentHotel = fallbackPanelData.hotels.find(h => h.isCurrentHotel);
        const hasAvailability = !!currentHotel;
        const hotelName = business?.name || "";
        const minPrice = business?.min_price;
        const nightsCount = (() => {
          const d1 = new Date(fallbackPanelData.checkIn);
          const d2 = new Date(fallbackPanelData.checkOut);
          const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
          return diff > 0 ? diff : 1;
        })();
        const totalMinPrice = minPrice ? minPrice * nightsCount : null;

        const actionCards: { icon: React.ReactNode; label: string; onClick: () => void; color: string; textColor?: string }[] = [];
        if (hasAvailability && business) {
          if (business.whatsapp) {
            actionCards.push({
              icon: <WhatsAppIcon className="h-5 w-5" />,
              label: "WhatsApp",
              onClick: () => window.open(whatsappUrl(business.whatsapp!), "_blank"),
              color: "#25D366",
            });
          }
          if (business.phone) {
            actionCards.push({
              icon: <span className="text-lg">📞</span>,
              label: language === "en" ? "Call" : "Téléphone",
              onClick: () => window.open(`tel:${business.phone!.replace(/(?!^\+)[^\d]/g, '')}`, "_self"),
              color: "#FFFFFF",
              textColor: "#000000",
            });
          }
          if (business.reserve_now_url) {
            const isExternal = business.reserve_now_force_external;
            actionCards.push({
              icon: <CalendarCheck className="h-5 w-5" />,
              label: CTA_MODE_LABELS[business.presentation_mode]?.[language === "en" ? "en" : "fr"] || (language === "en" ? "Book online" : "Réservez en ligne"),
              onClick: () => {
                if (isExternal) {
                  window.open(business.reserve_now_url!, "_blank");
                } else {
                  setBookingOverlayLoaded(false);
                  setBookingOverlayUrl(null);
                  setBookingOverlayTitle(undefined);
                  setShowBookingOverlay(true);
                }
              },
              color: "#25D366",
              textColor: "#000000",
            });
          }
          if (showGoogleMap && business.latitude && business.longitude) {
            actionCards.push({
              icon: <MapPin className="h-5 w-5" />,
              label: language === "en" ? "Directions" : "Vous rendre sur place",
              onClick: () => setShowDirections(true),
              color: "#C04F17",
            });
          }
        }

        return (
          <div className="flex flex-col items-center justify-start w-full">
            <div className="text-left text-white bg-black/40 backdrop-blur-sm rounded-xl px-4 md:px-5 py-4 border border-white/10 w-full md:w-auto">
              <div className="text-[14px] md:text-[20px] font-['Roboto',sans-serif] leading-relaxed space-y-2">
                {hasAvailability ? (
                  <>
                    <p>
                      <span className="font-bold">{hotelName}</span>{" "}
                      {language === "en"
                        ? "has availability for the selected dates."
                        : "a de la disponibilité sur les dates recherchées."}
                    </p>
                    {minPrice ? (
                      <p>
                        {language === "en" ? "The minimum price generally observed is" : "Le prix minimum généralement constaté est de"}{" "}
                        <span className="font-bold">{minPrice} €</span>{" "}
                        {language === "en" ? "per night" : "par nuit"}{" "}
                        {language === "en"
                          ? "but the price per night may vary depending on season and room type."
                          : "mais le prix par nuitée peut varier selon la saison et du type de chambre."}
                      </p>
                    ) : null}
                    {totalMinPrice ? (
                      <p>
                        {language === "en"
                          ? `You can therefore expect a minimum price for your stay of`
                          : `Vous pouvez donc vous attendre à un prix minimal pour votre séjour de`}{" "}
                        <span className="font-bold">{totalMinPrice} €</span>.
                      </p>
                    ) : null}
                    <p>
                      {language === "en"
                        ? <>Contact <span className="font-bold">{hotelName}</span> directly to book your stay.</>
                        : <>Renseignez-vous directement auprès de <span className="font-bold">{hotelName}</span> pour réserver votre séjour.</>}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      {language === "en"
                        ? `Unfortunately, we could not find availability at ${hotelName} for the selected dates.`
                        : `Malheureusement, nous n'avons pas pu trouver de disponibilité chez ${hotelName} sur les dates recherchées.`}
                    </p>
                    <p>
                      {language === "en"
                        ? "Please modify your search criteria or select an alternative below."
                        : "Veuillez modifier vos critères de recherche ou sélectionner une alternative ci-dessous."}
                    </p>
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={showCards}
                        className="px-4 py-2 rounded-lg text-xs md:text-sm font-medium font-['Josefin_Sans',sans-serif] shadow-lg hover:opacity-90 transition-opacity bg-gold text-black"
                        style={{ height: '40px' }}
                      >
                        {language === "en" ? "Change dates" : "Modifier les dates"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {actionCards.length > 0 && (
              <div className="flex flex-col items-center gap-2 mt-3" style={{ width: 'fit-content' }}>
                {actionCards.map((card, i) => (
                  <button
                    key={i}
                    onClick={card.onClick}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium font-['Josefin_Sans',sans-serif] shadow-lg hover:opacity-90 transition-opacity normal-case tracking-normal whitespace-nowrap w-full"
                    style={{ backgroundColor: card.color, color: card.textColor || "#FFFFFF", height: '40px' }}
                  >
                    {card.icon}
                    <span>{card.label}</span>
                  </button>
                ))}
              </div>
            )}

            {fallbackPanelData.hotels.filter(h => !h.isCurrentHotel).length > 0 && (
              <div className="text-center text-white bg-black/40 backdrop-blur-sm rounded-xl px-4 md:px-5 py-3 border border-white/10 mt-3 font-['Roboto',sans-serif] cursor-pointer hover:bg-black/50 transition-colors w-full md:w-auto" onClick={() => { onClosePanel?.(); }}>
                <p className="text-[14px] md:text-[20px] font-medium mb-1">
                  {fallbackPanelData.hotels.filter(h => !h.isCurrentHotel).length} {language === "en" ? "available hotels" : "hôtels disponibles"}
                </p>
                <p className="text-[12px] md:text-[16px] text-white/60">
                  {fallbackPanelData.checkIn} → {fallbackPanelData.checkOut} · {fallbackPanelData.adults} {language === "en" ? "adults" : "adultes"}
                </p>
                <p className="text-[12px] md:text-[16px] text-white/80 mt-1.5 underline underline-offset-2">
                  {language === "en" ? "View other available hotels" : "Consulter les autres établissements avec de la disponibilité"}
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
