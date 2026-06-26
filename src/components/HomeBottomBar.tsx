import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PanelSearchBar from "@/components/PanelSearchBar";
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
  const geo = useGeolocation();
  const [locationOpen, setLocationOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    const h = () => setLocationOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);

  return (
    <>
      {/* When closed: bottom-only strip (header stays clickable).
          When the search overlay opens: expand to full viewport so OverlayShell
          (absolute inset-0 of nearest positioned ancestor) covers the screen. */}
      <div
        className={`fixed z-[200] pointer-events-none ${
          overlayOpen ? "inset-0" : "inset-x-0 bottom-0"
        }`}
      >
        {/* Centered column: full viewport on mobile, central ~50% on desktop.
            This becomes the positioned ancestor for OverlayShell so the
            Search overlay stays bounded to the central column (same as /search). */}
        <div className="relative w-full h-full mx-auto sm:max-w-[640px] lg:max-w-[50vw] pointer-events-auto">
          <PanelSearchBar
            onSearch={(params) => {
              const qs = new URLSearchParams(params).toString();
              navigate(`/search?${qs}`);
            }}
            onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
            onAiClick={() => navigate("/search?tab=ai")}
            onOverlayChange={setOverlayOpen}
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
