import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getFlipbookEmbedUrl } from "@/lib/flipbookEmbed";

interface DocumentOverlayProps {
  url: string;
  name: string;
  type: "pdf" | "flipbook";
  ts: number;
  onClose: () => void;
  onLoad?: () => void;
}

const DocumentOverlay = ({ url, name, type, ts, onClose, onLoad }: DocumentOverlayProps) => {
  return (
    <div className="absolute inset-0 z-[85] bg-white flex flex-col overflow-hidden" style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}>
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
      </div>
      <div className="flex-1 relative bg-background overflow-hidden">
        {type === "flipbook" ? (
          <>
            {/* Fond derrière les chevrons de navigation gauche/droite */}
            <div className="absolute left-0 w-[44px] h-[80px] bg-primary/70 rounded-r-full pointer-events-none z-10 flex items-center justify-center" style={{ top: "calc((100% - 92px) / 2 - 20px)" }}>
              <ChevronLeft className="h-6 w-6 text-white" />
            </div>
            <div className="absolute right-0 w-[44px] h-[80px] bg-primary/70 rounded-l-full pointer-events-none z-10 flex items-center justify-center" style={{ top: "calc((100% - 92px) / 2 - 20px)" }}>
              <ChevronRight className="h-6 w-6 text-white" />
            </div>
            <iframe
              src={getFlipbookEmbedUrl(url)}
              className="border-0 absolute inset-0 w-full h-full"
              allow="clipboard-write; fullscreen"
              title={name}
              onLoad={onLoad}
            />
            {/* Masque la bannière promo FlipHTML5 en bas, y compris sa croix de fermeture */}
            <div className="absolute left-0 right-0 bottom-0 h-[92px] bg-background pointer-events-none z-30" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chargement du document…</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-primary underline hover:no-underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
            </div>
            <iframe
              key={`${url}-gview-${ts}`}
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="relative z-10 w-full border-0 bg-transparent"
              style={{ height: "calc(100% + 70px)", marginTop: "-70px" }}
              title={name}
              onLoad={onLoad}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentOverlay;
