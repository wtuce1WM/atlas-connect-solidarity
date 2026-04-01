import { X, ExternalLink } from "lucide-react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";

interface DocumentOverlayProps {
  url: string;
  name: string;
  type: "pdf" | "flipbook";
  ts: number;
  onClose: () => void;
}

const DocumentOverlay = ({ url, name, type, ts, onClose }: DocumentOverlayProps) => {
  return (
    <div className="absolute inset-0 -top-[3.3rem] z-[60] bg-white flex flex-col animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold truncate">{name}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir
        </a>
      </div>
      <div className="flex-1 relative pb-16 bg-background">
        {type === "flipbook" ? (
          <iframe
            src={getFlipbookEmbedUrl(url)}
            className="h-full w-full border-0"
            allow="clipboard-write; fullscreen"
            title={name}
          />
        ) : (
          <object
            key={`${url}-pdf-${ts}`}
            data={`${url}#toolbar=1&navpanes=0`}
            type="application/pdf"
            className="h-full w-full border-0"
            title={name}
          >
            <embed
              src={`${url}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="h-full w-full border-0"
            />
          </object>
        )}
      </div>
    </div>
  );
};

export default DocumentOverlay;
