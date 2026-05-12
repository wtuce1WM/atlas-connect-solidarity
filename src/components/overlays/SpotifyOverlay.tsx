import { X } from "lucide-react";
import OverlayShell from "@/components/overlays/OverlayShell";

interface SpotifyOverlayProps {
  url: string;
  businessName?: string;
  language?: string;
  onClose: () => void;
}

/**
 * Extract a Spotify embed URL from any standard Spotify share URL.
 * Supports: playlist, album, track, episode, show, artist
 * https://open.spotify.com/playlist/4KnqkOXvbgq20nmhvDvAsJ?si=...
 *   → https://open.spotify.com/embed/playlist/4KnqkOXvbgq20nmhvDvAsJ
 */
function buildSpotifyEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  // Already an embed URL
  if (/open\.spotify\.com\/embed\//.test(url)) return url.split("?")[0];
  const m = url.match(
    /open\.spotify\.com\/(playlist|album|track|episode|show|artist|user)\/([a-zA-Z0-9_.-]+)/,
  );
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=oneworldmorocco`;
}

const SpotifyOverlay = ({ url, businessName, language = "fr", onClose }: SpotifyOverlayProps) => {
  const embedUrl = buildSpotifyEmbedUrl(url);

  const title =
    language === "en"
      ? "Sound atmosphere"
      : language === "ar"
      ? "أجواء صوتية"
      : "Ambiance musicale";

  return (
    <OverlayShell
      zClass="z-[85]"
      animClass="animate-fade-in"
      desktopOnly={false}
      bg="bg-black/85 backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-white text-sm font-semibold tracking-wide truncate"
            style={{ fontFamily: "'Josefin Sans', sans-serif" }}
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

      {/* Player */}
      <div className="flex-1 flex items-center justify-center px-4 pb-6">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Spotify ${businessName || ""}`}
            className="w-full max-w-[640px] h-[480px] rounded-xl shadow-2xl"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 0 }}
          />
        ) : (
          <div className="text-white/80 text-sm text-center">
            {language === "en"
              ? "Invalid Spotify link."
              : "Lien Spotify invalide."}
          </div>
        )}
      </div>
    </OverlayShell>
  );
};

export default SpotifyOverlay;
