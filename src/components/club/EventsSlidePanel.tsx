import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronUp, ChevronDown, Calendar as CalendarIcon, MapPin, ExternalLink, Store } from "lucide-react";
import type { EventPanelItem } from "./ClubAiAssistant";

interface Props {
  open: boolean;
  onClose: () => void;
  items: EventPanelItem[];
  initialIndex?: number;
  onOpenBusiness?: (businessId: string) => void;
  isMobile?: boolean;
}

const fmtDate = (d: string | null | undefined) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};
const fmtDateRange = (a?: string | null, b?: string | null) => {
  const fa = fmtDate(a), fb = fmtDate(b);
  if (fa && fb && a !== b) return `${fa} → ${fb}`;
  return fa || fb || "";
};
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const fmtDays = (d?: number[] | null) => (Array.isArray(d) && d.length ? d.map((n) => DAYS[n] || "").filter(Boolean).join(" · ") : "");
const fmtTime = (a?: string | null, b?: string | null) => {
  const s = (t?: string | null) => (t ? String(t).slice(0, 5) : "");
  if (a && b) return `${s(a)} – ${s(b)}`;
  return s(a) || s(b) || "";
};

const EventsSlidePanel = ({ open, onClose, items, initialIndex = 0, onOpenBusiness, isMobile }: Props) => {
  const [index, setIndex] = useState(initialIndex);
  const [offsetY, setOffsetY] = useState(0);
  const startY = useRef<number | null>(null);
  const handled = useRef(false);

  useEffect(() => { if (open) setIndex(Math.max(0, Math.min(initialIndex, items.length - 1))); }, [open, initialIndex, items.length]);
  useEffect(() => { setOffsetY(0); }, [index]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, items.length - 1)), [items.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    handled.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setOffsetY(dy);
    if (!handled.current && Math.abs(dy) > 90) {
      handled.current = true;
      if (dy < 0) next(); else prev();
      setOffsetY(0);
      startY.current = null;
    }
  };
  const onTouchEnd = () => { startY.current = null; setOffsetY(0); };

  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 30) return;
    if (e.deltaY > 0) next(); else prev();
  };

  if (!open || !items.length) return null;
  const ev = items[index];
  const media = ev.image || null;
  const videoSrc = ev.video || null;
  const isFileVideo = !!videoSrc && !/youtube\.com|youtu\.be|vimeo\.com/i.test(videoSrc);

  return (
    <div
      className={`fixed inset-0 z-[220] bg-black flex flex-col ${isMobile ? "" : "lg:left-auto lg:w-1/2 lg:border-l lg:border-white/10"}`}
      onWheel={onWheel}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md text-white">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="h-4 w-4 shrink-0 text-[#D4AF37]" />
          <div className="text-sm font-semibold truncate">Agenda · {index + 1}/{items.length}</div>
        </div>
        <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Fermer">
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      <div
        className="relative flex-1 overflow-hidden select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="absolute inset-0 transition-transform duration-200"
          style={{ transform: offsetY ? `translateY(${offsetY}px)` : undefined }}
        >
          {isFileVideo ? (
            <video
              key={videoSrc!}
              src={videoSrc!}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster={media || undefined}
            />
          ) : media ? (
            <img src={media} alt={ev.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#C04F17]/40 to-[#0a1d6b]/60 flex items-center justify-center">
              <CalendarIcon className="h-16 w-16 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50" />

          <div className="absolute inset-x-0 top-[10%] px-6 text-center text-white">
            <h2 className="text-lg sm:text-2xl font-bold leading-tight line-clamp-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {ev.name}
            </h2>
            {ev.hook && <p className="mt-2 text-sm text-white/85 line-clamp-3">{ev.hook}</p>}
          </div>

          <div className="absolute inset-x-0 bottom-24 px-6 text-white space-y-1 text-center">
            {fmtDateRange(ev.start_date, ev.end_date) && (
              <p className="text-sm font-semibold">{fmtDateRange(ev.start_date, ev.end_date)}</p>
            )}
            {fmtDays(ev.days_of_week) && <p className="text-xs opacity-90">{fmtDays(ev.days_of_week)}</p>}
            {fmtTime(ev.start_time, ev.end_time) && <p className="text-xs opacity-90">{fmtTime(ev.start_time, ev.end_time)}</p>}
            {(ev.city || ev.neighborhood) && (
              <p className="text-xs opacity-80 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />{[ev.neighborhood, ev.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-6 px-6 flex flex-wrap items-center justify-center gap-2">
            {ev.default_business_id && onOpenBusiness && (
              <button
                onClick={() => onOpenBusiness(ev.default_business_id!)}
                className="px-4 py-2 rounded-full bg-white text-[#0a1d6b] text-sm font-semibold flex items-center gap-2 shadow-lg"
              >
                <Store className="h-4 w-4" /> Voir la fiche
              </button>
            )}
            {ev.url && (
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-[#C04F17] text-white text-sm font-semibold flex items-center gap-2 shadow-lg"
              >
                <ExternalLink className="h-4 w-4" /> Plus d'infos
              </a>
            )}
          </div>
        </div>

        {/* Prev/Next controls */}
        <button
          onClick={prev}
          disabled={index === 0}
          className="absolute top-1/2 -translate-y-1/2 left-3 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white disabled:opacity-30"
          aria-label="Précédent"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          disabled={index === items.length - 1}
          className="absolute top-1/2 translate-y-6 left-3 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white disabled:opacity-30"
          aria-label="Suivant"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default EventsSlidePanel;
