import React, { useCallback, useEffect, useState } from "react";

/**
 * Desktop-only anchor bar with scroll-spy for the Full Description overlay.
 *
 * It discovers sections generically by scanning the `h2` headings inside the
 * scroll container (id = `containerId`), so no section markup has to change.
 * Hidden on mobile (no room, and the reading flow is linear there).
 */
interface DescAnchorBarProps {
  /** id of the scrolling element containing the sections */
  containerId: string;
  /** re-scan trigger (content changes) */
  deps?: unknown;
}

type Anchor = { id: string; label: string };

const MAX_LABEL = 22;

const DescAnchorBar = ({ containerId, deps }: DescAnchorBarProps) => {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const scan = useCallback(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const heads = Array.from(root.querySelectorAll("h2")) as HTMLElement[];
    const next: Anchor[] = [];
    heads.forEach((h, i) => {
      const raw = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (!raw) return;
      if (!h.id) h.id = `owm-anchor-${i}`;
      const label = raw.length > MAX_LABEL ? `${raw.slice(0, MAX_LABEL - 1)}…` : raw;
      next.push({ id: h.id, label });
    });
    setAnchors((prev) =>
      prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.label === next[i].label)
        ? prev
        : next
    );
  }, [containerId]);

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
      ref={(el) => {
        stripRef.current = el;
        if (!el) return;
        if ((el as any).__owmWheelSet) return;
        (el as any).__owmWheelSet = true;
        el.addEventListener("wheel", (ev: WheelEvent) => {
          if (el.scrollWidth <= el.clientWidth) return;
          if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
          ev.preventDefault();
          el.scrollLeft += ev.deltaY;
        }, { passive: false });
      }}
      className="flex items-center gap-1.5 min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
    >
      {anchors.map((a) => (
        <button
          key={a.id}
          onClick={() => {
            const el = document.getElementById(a.id);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            setActiveId(a.id);
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
