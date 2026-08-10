import { useEffect } from "react";

/**
 * Force le chrome du navigateur mobile (barre d'état / barre d'URL Safari & Chrome)
 * en noir tant qu'un panneau plein écran sombre est monté.
 *
 * Sans ça, iOS Safari teinte ses bandes haut/bas avec la couleur de fond de la page
 * (#ECD6B8) — d'où les deux bandes beiges au-dessus et en dessous du média.
 */
export function useDarkBrowserChrome(active: boolean, color = "#000000") {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const metas = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
    const prevMeta = metas.map((m) => m.getAttribute("content"));
    if (metas.length === 0) {
      const m = document.createElement("meta");
      m.name = "theme-color";
      m.setAttribute("data-dark-chrome", "1");
      document.head.appendChild(m);
      metas.push(m);
      prevMeta.push(null);
    }
    metas.forEach((m) => m.setAttribute("content", color));

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;

    return () => {
      metas.forEach((m, i) => {
        if (m.dataset.darkChrome === "1") m.remove();
        else if (prevMeta[i] != null) m.setAttribute("content", prevMeta[i]!);
      });
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [active, color]);
}
