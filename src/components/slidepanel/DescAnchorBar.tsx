import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Anchor bar with scroll-spy for the Full Description overlay.
 *
 * It discovers sections generically by scanning the `h2` headings inside the
 * scroll container (id = `containerId`), so no section markup has to change.
 * Supports horizontal scrolling with the mouse wheel on all devices.
 */
interface DescAnchorBarProps {
  /** id of the scrolling element containing the sections */
  containerId: string;
  /** re-scan trigger (content changes) */
  deps?: unknown;
  /** UI language for generic labels */
  language?: string;
}

type Anchor = { id: string; label: string };

const MAX_LABEL = 22;

const DESC_LABEL: Record<string, string> = { fr: "À propos", en: "About", ar: "نبذة" };

const DescAnchorBar = ({ containerId, deps, language = "fr" }: DescAnchorBarProps) => {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  // Verrou : après un clic sur un badge, le scroll-spy est ignoré le temps
  // du scroll fluide, sinon une autre section « gagne » l'état sélectionné.
  const lockRef = useRef(0);

  // Molette (deltaY ou deltaX) + drag souris → scroll horizontal.
  // Ré-attaché quand la barre (dé)monte, car elle n'existe qu'à partir de 3 ancres.
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      const dx = e.deltaX * factor;
      const dy = e.deltaY * factor;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(delta) < 1) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + delta));
    };

    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      down = true; moved = false; startX = e.clientX; startScroll = el.scrollLeft;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!down) return;
      const d = e.clientX - startX;
      if (Math.abs(d) > 4) moved = true;
      if (moved) el.scrollLeft = startScroll - d;
    };
    const onPointerUp = () => { down = false; };
    const onClickCapture = (e: MouseEvent) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } };

    // La molette est écoutée sur la barre ET sur la ligne de header parente,
    // pour que le survol de toute la zone (au-dessus/à côté des pills) scrolle.
    const wheelTargets: HTMLElement[] = [el];
    const parent = el.parentElement;
    const headerRow = parent?.parentElement;
    if (parent) wheelTargets.push(parent);
    if (headerRow) wheelTargets.push(headerRow);
    wheelTargets.forEach((t) => t.addEventListener("wheel", onWheel, { passive: false, capture: true }));
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      wheelTargets.forEach((t) => t.removeEventListener("wheel", onWheel, { capture: true } as any));
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [anchors.length]);


  const scan = useCallback(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const heads = Array.from(root.querySelectorAll("h2")) as HTMLElement[];
    const next: Anchor[] = [];
    let descDone = false;
    heads.forEach((h, i) => {
      const raw = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (!raw) return;
      // Les H2 issus du corps de la Description ne produisent qu'un seul badge « À propos ».
      const inDescBody = !!h.closest("[data-owm-desc-body]");
      if (inDescBody) {
        if (descDone) return;
        descDone = true;
        if (!h.id) h.id = `owm-anchor-${i}`;
        next.push({ id: h.id, label: DESC_LABEL[language] || DESC_LABEL.fr });
        return;
      }
      if (!h.id) h.id = `owm-anchor-${i}`;
      const label = raw.length > MAX_LABEL ? `${raw.slice(0, MAX_LABEL - 1)}…` : raw;
      next.push({ id: h.id, label });
    });
    // Fallback : description sans aucun H2 → on ancre sur le corps de la description.
    if (!descDone) {
      const body = root.querySelector("[data-owm-desc-body]") as HTMLElement | null;
      if (body && (body.textContent || "").trim()) {
        if (!body.id) body.id = "owm-anchor-desc";
        next.unshift({ id: body.id, label: DESC_LABEL[language] || DESC_LABEL.fr });
      }
    }
    // Le badge de réservation passe toujours en première position.
    const isBooking = (l: string) => /r[ée]serv|billet|day pass/i.test(l);
    next.sort((a, b) => Number(isBooking(b.label)) - Number(isBooking(a.label)));
    setAnchors((prev) =>
      prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.label === next[i].label)
        ? prev
        : next
    );
  }, [containerId, language]);

  useEffect(() => {
    const t = window.setTimeout(scan, 250);
    const t2 = window.setTimeout(scan, 1200);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [scan, deps]);

  // Scroll-spy
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root || anchors.length === 0) return;
    const els = anchors
      .map((a) => document.getElementById(a.id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (Date.now() < lockRef.current) return;
        if (visible) setActiveId((visible.target as HTMLElement).id);
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [anchors, containerId]);

  if (anchors.length < 3) return null;

  return (
    <div
      dir="ltr"
      ref={wheelRef}
      className="animate-fade-in flex items-center gap-1.5 min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x cursor-grab"
    >

      {anchors.map((a) => (
        <button
          key={a.id}
          onClick={() => {
            const el = document.getElementById(a.id);
            lockRef.current = Date.now() + 900;
            setActiveId(a.id);
            // « À propos » remonte tout en haut de l'overlay (avant le hook)
            if (a.label === (DESC_LABEL[language] || DESC_LABEL.fr)) {
              const root = document.getElementById(containerId);
              if (root) { root.scrollTo({ top: 0, behavior: "smooth" }); return; }
            }
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}

          className={`shrink-0 h-7 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wide font-['Montserrat',sans-serif] whitespace-nowrap transition-colors border ${
            activeId === a.id
              ? "bg-white text-black border-white"
              : "bg-white/10 text-white/80 border-white/15 hover:bg-white/25 hover:text-white"
          }`}
          title={a.label}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};

export default DescAnchorBar;
