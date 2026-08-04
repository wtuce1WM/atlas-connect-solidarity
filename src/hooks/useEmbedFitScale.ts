// Mise à l'échelle du contenu d'un widget embarqué en mode `fit=h` / `fit=wh` :
// le contenu est réduit pour tenir exactement dans la hauteur de l'iframe hôte,
// avec overflow masqué → aucun scroll interne.
import { useEffect, useRef, useState, type CSSProperties } from "react";

export function useEmbedFitScale(enabled: boolean, deps: unknown[] = []) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const compute = () => {
      const el = innerRef.current;
      if (!el) return;
      const natural = el.scrollHeight;
      const avail = window.innerHeight - 8;
      if (natural < 40 || avail < 40) return;
      setScale(Math.min(1, avail / natural));
    };
    compute();
    const t = window.setTimeout(compute, 300);
    window.addEventListener("resize", compute);
    const el = innerRef.current;
    const ro = el ? new ResizeObserver(compute) : null;
    if (el && ro) ro.observe(el);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", compute);
      ro?.disconnect();
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const style: CSSProperties | undefined =
    enabled && scale < 1
      ? { transform: `scale(${scale})`, transformOrigin: "top center", width: `${100 / scale}%` }
      : undefined;

  return { innerRef, scale, style };
}
