import { useEffect, useLayoutEffect, useRef } from "react";
import { X, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phoneUtils";
import OverlayShell from "@/components/overlays/OverlayShell";

interface BookingOverlayProps {
  bookingUrl: string;
  title?: string;
  onClose: () => void;
  whatsapp?: string | null;
  phone?: string | null;
  onLoad?: () => void;
  hideContact?: boolean;
  /** Force a dark circular close button (white icon on black background). */
  closeVariant?: "auto" | "dark";
}

const BookingOverlay = ({ bookingUrl, title, onClose, whatsapp, phone, onLoad, hideContact, closeVariant = "auto" }: BookingOverlayProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Certaines pages tierces (notamment Wix avec son consentement différé) prennent
  // le focus après leur chargement. Le navigateur peut alors faire défiler non pas
  // `window`, mais un conteneur scrollable parent de l'assistant. On fige donc la
  // position de tous les ancêtres scrollables pendant cette phase automatique.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const scrollParents: HTMLElement[] = [];
    let parent = iframe.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll|overlay)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) {
        scrollParents.push(parent);
      }
      parent = parent.parentElement;
    }

    const windowAnchor = { x: window.scrollX, y: window.scrollY };
    const parentAnchors = scrollParents.map((element) => ({
      element,
      left: element.scrollLeft,
      top: element.scrollTop,
    }));
    let hadGesture = false;
    let reverting = false;
    const guardUntil = Date.now() + 8000;
    const markGesture = () => { hadGesture = true; };
    const restoreAnchors = () => {
      if (hadGesture || reverting || Date.now() > guardUntil) return;
      reverting = true;
      if (Math.abs(window.scrollY - windowAnchor.y) >= 4 || Math.abs(window.scrollX - windowAnchor.x) >= 4) {
        window.scrollTo(windowAnchor.x, windowAnchor.y);
      }
      for (const anchor of parentAnchors) {
        if (Math.abs(anchor.element.scrollTop - anchor.top) >= 4 || Math.abs(anchor.element.scrollLeft - anchor.left) >= 4) {
          anchor.element.scrollTo(anchor.left, anchor.top);
        }
      }
      requestAnimationFrame(() => { reverting = false; });
    };

    window.addEventListener("scroll", restoreAnchors, { passive: true });
    parentAnchors.forEach(({ element }) => element.addEventListener("scroll", restoreAnchors, { passive: true }));
    window.addEventListener("wheel", markGesture, { passive: true });
    window.addEventListener("touchstart", markGesture, { passive: true });
    window.addEventListener("keydown", markGesture, true);
    return () => {
      window.removeEventListener("scroll", restoreAnchors);
      parentAnchors.forEach(({ element }) => element.removeEventListener("scroll", restoreAnchors));
      window.removeEventListener("wheel", markGesture);
      window.removeEventListener("touchstart", markGesture);
      window.removeEventListener("keydown", markGesture, true);
    };
  }, [bookingUrl]);


  return (
    <OverlayShell
      zClass="z-[85]"
      bg="bg-white"
      animClass=""
      className=""
    >
      <div
        className="flex flex-col h-full"
        style={{ animation: "slide-up-from-bottom 0.4s ease-out both" }}
      >
        <div className="relative flex items-center px-4 py-2 border-b bg-white shrink-0">
          <button
            onClick={onClose}
            className={`h-9 w-9 flex items-center justify-center rounded-full border-2 shadow-2xl hover:opacity-90 transition-opacity shrink-0 ${
              closeVariant === "dark"
                ? "bg-black text-white border-white/20"
                : "bg-foreground text-background border-white/20"
            }`}
            title="Fermer"
            aria-label="Fermer la réservation"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold ml-2">{title || "Réservation"}</span>
          {!hideContact && whatsapp ? (
            <a
              href={whatsappUrl(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-1/2 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#25D366" }}
              title="WhatsApp"
              aria-label="Contacter sur WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
          ) : !hideContact && phone ? (
            <a
              href={`tel:${phone}`}
              className="absolute left-1/2 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
              title="Appeler"
              aria-label="Appeler par téléphone"
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        <iframe
          ref={iframeRef}
          src={bookingUrl}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="payment"
          title="Réservation"
          onLoad={onLoad}
        />
      </div>
    </OverlayShell>
  );
};

export default BookingOverlay;
