import { X } from "lucide-react";
import { getVideoEmbed } from "@/lib/videoEmbed";

interface VideoLightboxProps {
  url: string;
  onClose: () => void;
}

const VideoLightbox = ({ url, onClose }: VideoLightboxProps) => {
  const embed = getVideoEmbed(url, window.location.origin);
  const isEmbed = embed.type !== "file";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-white/80 z-10" onClick={onClose}>
        <X className="h-8 w-8" />
      </button>
      <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
        {isEmbed ? (
          <iframe
            src={embed.embedUrl}
            className="w-full h-full rounded-lg"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
          />
        ) : (
          <video src={url} controls autoPlay className="w-full h-full object-contain rounded-lg" />
        )}
      </div>
    </div>
  );
};

export default VideoLightbox;
