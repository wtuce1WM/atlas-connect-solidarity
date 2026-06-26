import { useNavigate } from "react-router-dom";
import PanelSearchBar from "@/components/PanelSearchBar";

/**
 * Bottom liquid-glass bar for the Homepage.
 * Re-uses the exact PanelSearchBar from /search (when the Google map is closed)
 * so the visual parameters stay identical.
 */
const HomeBottomBar = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] pointer-events-none">
      {/* Container that PanelSearchBar positions itself within (absolute bottom) */}
      <div className="relative h-24 pointer-events-auto">
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
  );
};

export default HomeBottomBar;
