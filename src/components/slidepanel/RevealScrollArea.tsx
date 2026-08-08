import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scrollable wrapper for the Full Description overlay.
 *
 * Two progressive-enhancement effects, both auto-disabled on short content
 * (so light fiches keep their instant, snappy rendering):
 *
 * 1. Reading progress bar (sticky, 2px, gold) — appears only when the content
 *    is meaningfully longer than the viewport.
 * 2. Section fade-in on scroll (IntersectionObserver) — direct children of the
 *    inner container fade + rise slightly as they enter the viewport, avoiding
 *    the "wall of text" effect on heavily populated fiches.
 *
 * Both effects are skipped when `prefers-reduced-motion` is set.
 */
interface RevealScrollAreaProps {
  children: React.ReactNode;
  /** classes for the scrolling element */
  className?: string;
  /** classes for the inner content wrapper (whose children get revealed) */
  innerClassName?: string;
  /** content must be at least this many times the viewport height to enable FX */
  threshold?: number;
  /** id forwarded to the scrolling element (used by the anchor bar scroll-spy) */
  id?: string;
}

const RevealScrollArea = ({
  children,
  className = "",
  innerClassName = "",
  threshold = 1.4,
  id,
}: RevealScrollAreaProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLong, setIsLong] = useState(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const long = el.scrollHeight > el.clientHeight * threshold;
    setIsLong(long);
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
  }, [threshold]);

  // Track size / content changes
  useEffect(() => {
    const el = scrollRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measure, children]);

  // Reveal direct children when content is long enough
  useEffect(() => {
    const root = scrollRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;

    observerRef.current?.disconnect();
    observerRef.current = null;

    const kids = Array.from(inner.children) as HTMLElement[];

    if (!isLong || reducedMotion) {
      kids.forEach((k) => k.classList.remove("owm-reveal", "owm-reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("owm-reveal-in");
            io.unobserve(entry.target);
          }
        });
      },
      { root, rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    kids.forEach((k, i) => {
      // First items are visible immediately — no flash on open
      if (i < 2) {
        k.classList.add("owm-reveal", "owm-reveal-in");
        return;
      }
      k.classList.add("owm-reveal");
      io.observe(k);
    });

    observerRef.current = io;
    return () => io.disconnect();
  }, [isLong, reducedMotion, children]);

  return (
    <div
      ref={scrollRef}
      id={id}
      onScroll={measure}
      className={`w-full h-full overflow-y-auto overscroll-contain ${className}`}
    >
      {isLong && (
        <div className="sticky top-0 z-40 h-[2px] w-full bg-white/10">
          <div
            className="h-full bg-gold transition-[width] duration-150 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      <div ref={innerRef} className={innerClassName}>
        {children}
      </div>
    </div>
  );
};

export default RevealScrollArea;
