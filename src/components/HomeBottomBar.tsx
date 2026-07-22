import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PanelSearchBar from "@/components/PanelSearchBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import ClubLoginPopup from "@/components/club/ClubLoginPopup";
import { useGeolocation } from "@/hooks/useGeolocation";

/**
 * Bottom liquid-glass bar for the Homepage.
 *
 * The outer wrapper is a full-viewport fixed layer so that the Search
 * overlay (mounted by PanelSearchBar via OverlayShell using `absolute inset-0`)
 * can actually cover the screen. Clicks only land where pointer-events-auto
 * is enabled: the dock pill at the bottom, and the search overlay surface
 * once it opens.
 */
const HomeBottomBar = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const geo = useGeolocation();
  const [locationOpen, setLocationOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [closeTrigger, setCloseTrigger] = useState(0);

  useEffect(() => {
    const h = () => setLocationOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);

  return (
    <>
      {/* Full-viewport scrim behind the centered overlay column */}
      {overlayOpen && (
        <div
          className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setCloseTrigger((n) => n + 1)}
          aria-hidden
        />
      )}

      <div
        className={`fixed z-[200] pointer-events-none ${
          overlayOpen ? "inset-0" : "inset-x-0 bottom-0"
        }`}
      >
        <div className={`relative h-full mx-auto pointer-events-auto ${overlayOpen ? "w-full sm:max-w-[640px] lg:max-w-[50vw]" : "w-[90%] sm:max-w-[640px] lg:w-1/2 lg:max-w-[50vw]"}`}>
          <PanelSearchBar
            onSearch={(params) => {
              const qs = new URLSearchParams(params).toString();
              navigate(withLangPrefix(`/search?${qs}`, language));
            }}
            onBusinessSelect={(bizId) => navigate(withLangPrefix(`/search?openBusiness=${bizId}`, language))}
            onAiClick={() => navigate(withLangPrefix("/search?tab=ai", language))}
            onOverlayChange={setOverlayOpen}
            closeTrigger={closeTrigger}
            noToolbarOffset
          />
        </div>
      </div>

      <ClubLoginPopup />

      <LocationPickerDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        coords={geo.coords}
        detectedCity={geo.confirmedAddress || geo.detectedCity}
        isEnabled={geo.isEnabled}
        isDetecting={geo.isDetecting}
        onUseCurrentPosition={() => {
          if (!geo.isEnabled) geo.accept();
        }}
        onConfirm={(confirmedCoords, address) => {
          geo.setManualLocation(confirmedCoords, address);
        }}
        onDisableGeo={() => {
          try {
            localStorage.removeItem("geo_manual_coords");
            localStorage.removeItem("geo_manual_address");
          } catch {
            /* noop */
          }
          geo.decline();
        }}
      />
    </>
  );
};

export default HomeBottomBar;
