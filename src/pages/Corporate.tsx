import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import heroHomeAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import zelligeMobileAsset from "@/assets/backgr-brun-zelliges.webp.asset.json";
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

    // Parallax on hero bg (mirrors homepage) — desktop image + mobile phone mockup + section bg
    const heroBg = root.querySelector<HTMLImageElement>(".hero .bg-img-desktop");
    const heroBgMobile = root.querySelector<HTMLImageElement>(".hero .bg-img-mobile");
    const heroSection = root.querySelector<HTMLElement>(".hero");
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (window.innerWidth < 1024) {
          if (heroBgMobile) heroBgMobile.style.transform = `scale(.95) translate3d(0, ${y * -0.35}px, 0)`;
          if (heroSection) heroSection.style.backgroundPosition = `center calc(50% + ${y * 0.4}px)`;
        }
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      root.removeEventListener("click", onClick);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [navigate]);


  return (
    <>
      <HomeMindtripHeader />
      <div
        ref={rootRef}
        className="corp-page"
        style={{
          ["--hero-img-desktop" as any]: `url("${heroHomeAsset.url}")`,
          ["--hero-img-tablet" as any]: `url("${zelligeMobileAsset.url}")`,
          ["--hero-img-mobile" as any]: `url("${zelligeMobileAsset.url}")`,
          ["--hero-phone-mockup" as any]: `url("${phoneMockupAsset.url}")`,
          ["--hero-phone-mockup-tablet" as any]: `url("${iphoneTabletMockupAsset.url}")`,
        }}
      >
        <style>{corporateCss}</style>
        <div dangerouslySetInnerHTML={{ __html: corporateBody }} />
      </div>
      <Footer variant="verified" />
    </>
  );
};


export default Corporate;
