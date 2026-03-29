import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBlockedDomains, isDomainInSet } from "@/hooks/useBlockedDomains";

interface BookingOverlayProps {
  bookingUrl: string;
  title?: string;
  onClose: () => void;
}

const IFRAME_LOAD_TIMEOUT_MS = 5000;

const BookingOverlay = ({ bookingUrl, title, onClose }: BookingOverlayProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-slide-down-from-top">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background border-2 border-white/20 shadow-2xl hover:opacity-90 transition-opacity shrink-0"
            title="Fermer"
            aria-label="Fermer la réservation"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{title || "Réservation"}</span>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={bookingUrl}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="payment"
        title="Réservation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default BookingOverlay;
