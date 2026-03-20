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

  useEffect(() => {
    if (knownBlocked) return; // No need for timeout, already blocked

    loadedRef.current = false;
    const timer = setTimeout(() => {
      // Only show fallback if onLoad never fired
      if (!loadedRef.current) {
        setIframeBlocked(true);
      }
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [bookingUrl, knownBlocked]);

  const handleIframeLoad = () => {
    loadedRef.current = true;
    setIframeBlocked(false);
  };

  return (
    <div className="absolute inset-0 z-[60] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
        <span className="text-sm font-semibold">Réservation</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {iframeBlocked && (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center flex-1">
          <p className="text-sm text-muted-foreground">
            Ce site de réservation ne peut pas s'afficher ici.
          </p>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir la réservation
          </a>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={bookingUrl}
        className={`flex-1 w-full border-0 ${iframeBlocked ? "hidden" : ""}`}
        allow="payment"
        title="Réservation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default BookingOverlay;
