import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  /** Render children only once this wrapper enters (or nears) the viewport. */
  children: ReactNode;
  /** Min height reserved while children are not yet mounted (avoids layout shift). */
  minHeight?: number | string;
  /** IntersectionObserver rootMargin (e.g. "200px" to mount slightly before visible). */
  rootMargin?: string;
  /** Optional className applied to the placeholder/wrapper. */
  className?: string;
}

/**
 * Mount-on-visibility wrapper. Once the placeholder is observed within the viewport
 * (or its rootMargin), `children` are rendered and the observer is disconnected.
 *
 * Use to defer heavy below-the-fold sections (carousels, video grids, embeds) so that
 * their data fetching and React tree creation don't block first paint.
 */
const LazyMount = ({ children, minHeight = 320, rootMargin = "300px", className }: LazyMountProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;
  return <div ref={ref} className={className} style={{ minHeight }} aria-hidden />;
};

export default LazyMount;
