import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import zelligeMobileAsset from "@/assets/backgr-brun-zelliges.webp.asset.json";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
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

    // Parallax on hero bg (mirrors homepage) — desktop image + mobile phone mockup + section bg + mouse parallax
    const heroBg = root.querySelector<HTMLImageElement>(".hero .bg-img-desktop");
    const heroBgMobile = root.querySelector<HTMLImageElement>(".hero .bg-img-mobile");
    const heroSection = root.querySelector<HTMLElement>(".hero");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Static fallback: keep the image parallax but skip mouse/content parallax
      const onScroll = () => {
        const y = window.scrollY;
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (window.innerWidth < 1024) {
          if (heroBgMobile) heroBgMobile.style.transform = `scale(.95) translate3d(0, ${y * -0.35}px, 0)`;
          if (heroSection) heroSection.style.backgroundPosition = `center calc(50% + ${y * 0.4}px)`;
        }
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      let mx = 0, my = 0, tx = 0, ty = 0, sy = 0, ticking = false;
      const update = () => {
        const y = window.scrollY;
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (window.innerWidth < 1024) {
          if (heroBgMobile) heroBgMobile.style.transform = `scale(.95) translate3d(0, ${y * -0.35}px, 0)`;
          if (heroSection) heroSection.style.backgroundPosition = `center calc(50% + ${y * 0.4}px)`;
        }

        tx += (mx - tx) * 0.08;
        ty += (my - ty) * 0.08;
        if (heroSection) {
          heroSection.style.setProperty("--mx", tx.toFixed(3));
          heroSection.style.setProperty("--my", ty.toFixed(3));
          heroSection.style.setProperty("--sy", sy.toFixed(3));
        }
        if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
          requestAnimationFrame(update);
        } else {
          ticking = false;
        }
      };
      const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      const onMove = (e: MouseEvent) => {
        if (!heroSection) return;
        const r = heroSection.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
      };
      const onLeave = () => { mx = 0; my = 0; kick(); };
      const onScroll = () => {
        if (!heroSection) return;
        const r = heroSection.getBoundingClientRect();
        sy = Math.max(-1, Math.min(1, -r.top / r.height));
        kick();
      };
      heroSection?.addEventListener("mousemove", onMove);
      heroSection?.addEventListener("mouseleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
      update();
    }

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
          ["--hero-img-desktop" as any]: `url("${originalHeroAsset.url}")`,
          ["--hero-img-tablet" as any]: `url("${zelligeBrunAsset.url}")`,
          ["--hero-img-mobile" as any]: `url("${koutoubiaVerticalBgAsset.url}")`,
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
