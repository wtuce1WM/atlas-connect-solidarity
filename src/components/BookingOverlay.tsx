import { useState, useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";

interface BookingOverlayProps {
  bookingUrl: string;
  onClose: () => void;
}

const IFRAME_LOAD_TIMEOUT_MS = 5000;

// Blocked domains detected via check-iframe-blocked edge function (scan 20/03/2026 – 42 bloqués / 63 établissements)
const KNOWN_BLOCKED_DOMAINS = [
  // X-Frame-Options: DENY
  'www.mandarinoriental.com',
  'www.riadelhara.com',
  'www.jetex.com',
  'www.selman-marrakech.com',
  'reservation.marrakech.maison-stella-cadente.com',
  'www.sevenrooms.com',
  'tickets.jardinmajorelle.com',
  // X-Frame-Options: SAMEORIGIN
  'permalink.fairmont.com',
  'www.lunajets.com',
  'www.essaouirakitesurfschool.com',
  'www.cenizaro.com',
  'linktr.ee',
  'app.thebookingbutton.com',
  'resnexus.com',
  'www.foundouk.com',
  'goodkarmatravels.jimdosite.com',
  'reservations.verticalbooking.com',
  'rentaphone.ma',
  'fr.hotels.com',
  'www.riadtammam.com',
  'book-directonline.com',
  'mamounia.com',
  'www.nobuhotels.com',
  'www.oberoihotels.com',
  'www.widiane.net',
  'www.cactusthiemann.com',
  'direct-book.com',
  'xaluca.com',
  // CSP frame-ancestors
  'www.onomohotels.com',
  'www.dabadoc.com',
  'www.relaischateaux.com',
  // HTTP errors / site en panne
  'darbacha.com',
  'almoravidkoubba.com',
  'menaragardens.com',
  // Connexion échouée (site injoignable)
  'www.opentable.co.uk',
  'dentistmarrakech.com',
  'www.simplebooking.it',
  'www.mazaganbeachresort.com',
  'omyoga.ma',
  'www.supratours.ma',
  'beautynow.ma',
  'www.lemapmarrakech.com',
];

function isDomainBlocked(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return KNOWN_BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

const BookingOverlay = ({ bookingUrl, onClose }: BookingOverlayProps) => {
  const knownBlocked = isDomainBlocked(bookingUrl);
  const [iframeBlocked, setIframeBlocked] = useState(knownBlocked);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);

  // If domain is known blocked, open externally immediately and close overlay
  useEffect(() => {
    if (knownBlocked) {
      window.open(bookingUrl, "_blank", "noopener,noreferrer");
      onClose();
    }
  }, [knownBlocked, bookingUrl, onClose]);

  useEffect(() => {
    if (knownBlocked) return;

    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) {
        // Timeout: open externally and close
        window.open(bookingUrl, "_blank", "noopener,noreferrer");
        onClose();
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bookingUrl, knownBlocked, onClose]);

  const handleIframeLoad = () => {
    loadedRef.current = true;
    setIframeBlocked(false);
  };

  // Don't render if blocked
  if (iframeBlocked) return null;

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
          <span className="text-sm font-semibold">Réservation</span>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={bookingUrl}
        className="flex-1 w-full border-0"
        allow="payment"
        title="Réservation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default BookingOverlay;
