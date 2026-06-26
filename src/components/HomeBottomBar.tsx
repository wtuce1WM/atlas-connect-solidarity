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
      {/* Full-viewport fixed layer so OverlayShell's absolute inset-0 spans the screen */}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* This wrapper is the positioned ancestor for PanelSearchBar overlays.
            When the search overlay is open, allow clicks on the whole layer; otherwise
            only the dock pill (its own pointer-events-auto) receives clicks. */}
        <div className={`absolute inset-0 ${overlayOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <div className="absolute inset-x-0 bottom-0 pointer-events-auto">
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
