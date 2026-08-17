import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";

export type EmbedFilterItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** Inline style (badges prioritaires terracotta / gold) */
  style?: React.CSSProperties;
  /** Classes de la pastille quand aucun style inline n'est fourni */
  className?: string;
  /** Remonté dans la ligne « peek » visible tiroir replié */
  priority?: boolean;
};

export type EmbedFilterGroup = {
  id: string;
  label: string;
  items: EmbedFilterItem[];
};

type Props = {
  groups: EmbedFilterGroup[];
  /** Classes du panneau (fond + bordure + encre) */
  panelClass: string;
  labelClass: string;
  /**
   * Fond opaque forcé du tiroir, de la poignée et de la ligne « peek ».
   * Utilisé par l'overlay Full Description du slidepanel, où tout le reste est
   * transparent : sans fond, les filtres seraient illisibles.
   */
  surfaceStyle?: React.CSSProperties;
  /** Ratio de hauteur max du tiroir déplié (0-1) */
  maxRatio?: number;
  /** Referme le tiroir après un clic sur un filtre */
  closeOnPick?: boolean;
  fontStyle?: React.CSSProperties;
  handleLabel: string;
};

/**
 * Zone dépliable des badges/filtres dynamiques de /embed/ask.
 *
 * Positionnée en overlay `absolute` au-dessus du composer (jamais `fixed` :
 * l'embed tourne en iframe scalé, et jamais dans le flux : la hauteur remontée
 * à l'hôte ne doit pas changer à l'ouverture).
 */
export const EmbedFilterDrawer: React.FC<Props> = ({
  groups,
  panelClass,
  labelClass,
  maxRatio = 0.7,
  closeOnPick = true,
  fontStyle,
  handleLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const [maxH, setMaxH] = useState(360);
  const rootRef = useRef<HTMLDivElement>(null);

  const all = groups.flatMap((g) => g.items);
  const peek = all.filter((i) => i.priority).slice(0, 3);
  const count = all.length;

  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight || 640;
      const ratio = h < 600 ? Math.min(maxRatio, 0.6) : maxRatio;
      // Feuille ancrée au bas du viewport : borne = ratio du viewport
      setMaxH(Math.max(180, Math.round(h * ratio)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [maxRatio, open, count]);


  // Reset quand la liste disparaît (nouvelle conversation, competitor guard…)
  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);


  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    setDrag(open ? Math.max(0, dy) : Math.min(0, dy));
  }, [open]);

  const onPointerUp = useCallback(() => {
    if (startY.current === null) return;
    const threshold = 40;
    if (open && drag > threshold) setOpen(false);
    else if (!open && drag < -threshold) setOpen(true);
    startY.current = null;
    setDrag(0);
  }, [open, drag]);

  if (count === 0) return null;

  const pill = (i: EmbedFilterItem) => (
    <button
      key={i.id}
      type="button"
      onClick={() => {
        if (closeOnPick) setOpen(false);
        i.onClick();
      }}
      style={{ ...fontStyle, ...i.style }}
      className={
        i.style
          ? "text-xs px-3 py-1.5 rounded-full border transition-opacity inline-flex items-center gap-1.5 font-bold hover:opacity-90 shrink-0"
          : `text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 hover:opacity-90 shrink-0 ${i.className ?? ""}`
      }
    >
      {i.icon}
      {i.label}
    </button>
  );

  return (
    <>
      {/* Voile sombre — remonte jusqu'en haut du viewport */}
      <div
        onClick={() => setOpen(false)}
        className={`absolute bottom-0 inset-x-0 z-20 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ height: "200vh", background: "rgba(0,0,0,0.45)" }}
        aria-hidden={!open}
      />

      {/* Feuille dépliée — ancrée au bas du viewport, recouvre le composer */}
      <div
        className={`absolute bottom-0 inset-x-0 z-40 overflow-hidden transition-transform duration-200 ease-out ${
          open ? "" : "pointer-events-none"
        }`}
        style={{
          transform: open
            ? `translateY(${drag}px)`
            : `translateY(${maxH + 24 + drag}px)`,
          opacity: open || drag < 0 ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div
          className={`rounded-t-2xl border-t border-x shadow-[0_-8px_32px_rgba(0,0,0,0.25)] ${panelClass}`}
          style={{ maxHeight: maxH, overflowY: "auto" }}
        >

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="sticky top-0 flex items-center justify-center py-3 cursor-grab touch-none"
            style={{ minHeight: 44 }}
          >
            <span className="w-10 h-1.5 rounded-full bg-current opacity-25" />
          </div>
          <div className="px-3 pb-3 space-y-3">
            {groups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.id} className="space-y-1.5">
                  <div className={`text-[10px] uppercase tracking-wide ${labelClass}`} style={fontStyle}>
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-2">{g.items.map(pill)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Ligne peek + poignée (repliée) */}
      <div ref={rootRef} className="relative z-30 flex items-center gap-2 pb-2">

        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {peek.map(pill)}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-expanded={open}
          style={fontStyle}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 font-semibold hover:opacity-90 touch-none ${panelClass}`}
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          {handleLabel} · {count}
        </button>
      </div>
    </>
  );
};

export default EmbedFilterDrawer;
