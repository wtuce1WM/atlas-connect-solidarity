/**
 * Aperçu vidéo identique au backoffice (/staff/catalogue → fiche business) :
 * YouTube / Vimeo → iframe du player, vidéo hébergée → élément <video>.
 * Aucune vignette calculée : on affiche la source réelle.
 */
interface VideoDocPreviewProps {
  url: string;
  className?: string;
  /** Bloque les interactions (utile quand la tuile est cliquable). */
  inert?: boolean;
  title?: string;
}

const VideoDocPreview = ({ url, className = "", inert = false, title }: VideoDocPreviewProps) => {
  const style = inert ? { pointerEvents: "none" as const } : undefined;

  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        title={title || "YouTube"}
        className={`w-full h-full border-0 ${className}`}
        style={style}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        title={title || "Vimeo"}
        className={`w-full h-full border-0 ${className}`}
        style={style}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }

  return (
    <video
      src={url}
      className={`w-full h-full object-cover ${className}`}
      style={style}
      muted
      playsInline
      preload="metadata"
    />
  );
};

export default VideoDocPreview;
