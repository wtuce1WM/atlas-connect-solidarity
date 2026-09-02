import { Menu } from "lucide-react";

/**
 * Header statique (non lazy) utilisé comme fallback de Suspense global.
 * Reproduit exactement la barre de `FrontHeader` (logo + hamburger) afin que
 * le header reste visible pendant le chargement d'un chunk de page :
 * plus d'effet "reload" au changement de page depuis le menu.
 */
const FrontHeaderSkeleton = () => (
  <div
    className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 pt-safe md:px-10"
    aria-hidden="true"
  >
    <div className="flex items-center gap-3">
      <img
        src="/images/logo_blanc.webp"
        alt=""
        className="h-7 w-7 shrink-0 object-contain"
      />
      <span className="font-josefin text-xs font-black uppercase tracking-[0.2em] text-[#F4EEE4] md:text-sm">
        One World Morocco
      </span>
    </div>
    <div className="mt-2 rounded-full border border-[rgba(244,238,228,0.2)] bg-transparent p-2.5 text-[#F4EEE4]">
      <Menu className="h-5 w-5" />
    </div>
  </div>
);

export default FrontHeaderSkeleton;
