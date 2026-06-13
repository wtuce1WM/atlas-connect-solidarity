import { X } from "lucide-react";
import OverlayShell from "@/components/overlays/OverlayShell";

interface SoundCloudOverlayProps {
  url: string;
  businessName?: string;
  language?: string;
  onClose: () => void;
}

/**
 * Build a SoundCloud embed URL from any standard SoundCloud share URL.
 * https://soundcloud.com/user/track-or-set
 *   → https://w.soundcloud.com/player/?url=<encoded>&...
 */
function buildSoundCloudEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!/soundcloud\.com\//i.test(url)) return null;
  const params = new URLSearchParams({
    url,
    color: "#ff5500",
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "false",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

const SoundCloudOverlay = ({ url, businessName, language = "fr", onClose }: SoundCloudOverlayProps) => {
  const embedUrl = buildSoundCloudEmbedUrl(url);

  const title =
    language === "en"
      ? "SoundCloud"
      : language === "ar"
      ? "ساوند كلاود"
      : "SoundCloud";

  return (
    <OverlayShell
      zClass="z-[85]"
      animClass="animate-fade-in"
      desktopOnly={false}
      bg="bg-black/85 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-white text-sm font-semibold tracking-wide truncate"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {title}
            {businessName && (
              <span className="text-white/60 font-normal"> — {businessName}</span>
            )}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label={language === "en" ? "Close" : "Fermer"}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-6">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`SoundCloud ${businessName || ""}`}
            className="w-full max-w-[640px] h-[480px] rounded-xl shadow-2xl"
            allow="autoplay; encrypted-media; fullscreen"
            loading="lazy"
            style={{ border: 0 }}
          />
        ) : (
          <div className="text-white/80 text-sm text-center">
            {language === "en" ? "Invalid SoundCloud link." : "Lien SoundCloud invalide."}
          </div>
        )}
      </div>
    </OverlayShell>
  );
};

export default SoundCloudOverlay;
