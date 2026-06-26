import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PanelSearchBar from "@/components/PanelSearchBar";
import LocationPickerDialog from "@/components/LocationPickerDialog";
import { useGeolocation } from "@/hooks/useGeolocation";

/**
 * Bottom liquid-glass bar for the Homepage.
 * Re-uses the exact PanelSearchBar from /search (when the Google map is closed)
 * so the visual parameters stay identical.
 *
 * - Search → opens the search overlay in the centered middle half of the screen.
 * - Lieu  → opens the geolocation picker dialog.
 * - IA    → routes to /search?tab=ai.
 * - Profil → handled by PanelSearchBar (Club popup or /club).
 */
const HomeBottomBar = () => {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [locationOpen, setLocationOpen] = useState(false);

  useEffect(() => {
    const h = () => setLocationOpen(true);
    window.addEventListener("open-location-picker", h);
    return () => window.removeEventListener("open-location-picker", h);
  }, []);

  return (
    <>
      {/* Fixed full-viewport layer; only the centered column receives clicks */}
      <div className="fixed inset-x-0 bottom-0 z-[200] pointer-events-none flex justify-center">
        {/* Centered column = "middle half" of the screen used by the Search overlay */}
        <div className="relative w-full max-w-[640px] lg:max-w-[50vw] pointer-events-auto">
          <PanelSearchBar
            onSearch={(params) => {
              const qs = new URLSearchParams(params).toString();
              navigate(`/search?${qs}`);
            }}
            onBusinessSelect={(bizId) => navigate(`/search?openBusiness=${bizId}`)}
            onAiClick={() => navigate("/search?tab=ai")}
            noToolbarOffset
          />
        </div>
      </div>

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
