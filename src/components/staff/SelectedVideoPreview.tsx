import { useState } from "react";
import VideoThumbnail from "@/components/VideoThumbnail";

interface SelectedVideoPreviewProps {
  url: string;
  /** Miniature stockée en base si disponible (video_documents.thumbnail_url). */
  thumbnail?: string | null;
}

/**
 * Aperçu d'une vidéo sélectionnée : affiche une vraie miniature (thumbnail_url
 * en base, sinon capture d'une frame côté client) sous le lecteur, et la masque
 * dès que la lecture démarre.
 */
const SelectedVideoPreview = ({ url, thumbnail }: SelectedVideoPreviewProps) => {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!playing && (
        <div className="absolute inset-0 pointer-events-none">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-contain" loading="lazy" />
          ) : (
            <VideoThumbnail src={url} className="w-full h-full object-contain" />
          )}
        </div>
      )}
      <video
        src={url}
        poster={thumbnail || undefined}
        controls
        muted
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="relative w-full h-full object-contain bg-transparent"
      />
    </div>
  );
};

export default SelectedVideoPreview;
