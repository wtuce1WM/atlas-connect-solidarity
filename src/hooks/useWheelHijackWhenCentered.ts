import { useEffect, useRef } from "react";

/**
 * Quand l'élément horizontalement scrollable se trouve dans la moitié verticale
 * du viewport (bande centrale [25% ; 75%]), capte le wheel deltaY de la page
 * et le convertit en scroll horizontal sur l'élément. Aux extrémités du scroll,
 * la page reprend son défilement normal.
 */
export function useWheelHijackWhenCentered<T extends HTMLElement = HTMLElement>(
  enabled: boolean = true
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (e: WheelEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (el.scrollWidth <= el.clientWidth) return;

      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const centerY = rect.top + rect.height / 2;
      const inBand = centerY >= vh * 0.25 && centerY <= vh * 0.75;
      if (!inBand) return;

      const delta = e.deltaY;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd =
        el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;
      if (atStart || atEnd) return;

      e.preventDefault();
      el.scrollLeft += delta;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [enabled]);

  return ref;
}
