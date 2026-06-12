import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
// @ts-ignore - raw imports provided by Vite
import corporateCss from "./corporate.scoped.css?raw";
// @ts-ignore
import corporateBody from "./corporate.body.html?raw";

const Corporate = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  // Intercept internal-link clicks → React Router navigation.
  // Keep anchor (#id) clicks for smooth-scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#")) {
        e.preventDefault();
        const id = href.slice(1);
        const el = id ? document.getElementById(id) : null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Internal route (starts with "/" and not "//")
      if (href.startsWith("/") && !href.startsWith("//")) {
        e.preventDefault();
        navigate(href);
      }
    };

    root.addEventListener("click", onClick);

    // Reveal-on-scroll for .reveal elements (mirrors the original script).
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((x) => {
          if (x.isIntersecting) {
            (x.target as HTMLElement).classList.add("in");
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.14 },
    );
    root.querySelectorAll<HTMLElement>(".reveal").forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(el);
    });

    return () => {
      root.removeEventListener("click", onClick);
      io.disconnect();
    };
  }, [navigate]);

  return (
    <>
      <HomeMindtripHeader />
      <div
        ref={rootRef}
        className="corp-page"
        style={{ paddingTop: 72 }}
      >
        <style>{corporateCss}</style>
        <div dangerouslySetInnerHTML={{ __html: corporateBody }} />
      </div>
      <Footer variant="verified" />
    </>
  );
};

export default Corporate;
