import { useState, useEffect, useRef } from "react";
import { Share2, X, Check, Copy, Link as LinkIcon, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { FacebookIcon, TwitterIcon, WhatsAppIcon, LinkedInIcon } from "@/components/staff/SocialMediaIcons";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface ShareButtonProps {
  /** Optional custom title for the share text. Defaults to document.title */
  title?: string;
  /** Optional custom URL to share (e.g. OG proxy URL). Defaults to window.location.href */
  shareUrl?: string;
  /** Optional preview image shown in the share modal (instead of the OWM logo) */
  previewImage?: string | null;
  /** Button color variant */
  variant?: "light" | "dark" | "gold";
  className?: string;
  /** Extra classes applied to the trigger button itself */
  buttonClassName?: string;
}

const ShareButton = ({ title, shareUrl, previewImage, variant = "gold", className = "", buttonClassName = "" }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawUrl = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
  // Strip internal cache-buster _t from shared URLs ; route public pages via the
  // og-meta proxy so social bots (WhatsApp, Facebook, LinkedIn…) get a dynamic
  // OG preview even though the site is hosted as a static SPA on Lovable.
  const PROXIED_PREFIXES = [
    "/search",
    "/fiche/",
    "/destination/",
    "/category/",
    "/subcategory/",
    "/service/",
    "/neighborhood/",
    "/city/",
  ];
  // Single-segment paths handled by VanityResolver — must mirror its RESERVED set.
  const RESERVED_ROOT = new Set([
    "", "videos", "ancien-index", "business", "city", "category", "service",
    "search", "staff", "affiliates", "devenir-affilie", "mission", "contact",
    "blog", "neighborhood", "carte", "subcategory", "hotels", "club",
    "search-analytics", "destination", "conditions-generales", "unsubscribe",
    "fiche", "test", "install", "corporate", "u", "y",
  ]);
  const cleanUrl = (() => {
    try {
      const url = new URL(rawUrl);
      url.searchParams.delete("_t");
      const isPrefixMatch = PROXIED_PREFIXES.some(
        (p) => url.pathname === p || url.pathname.startsWith(p),
      );
      const vanityMatch = url.pathname.match(/^\/([^/]+)\/?$/);
      const isVanity = !!vanityMatch && !RESERVED_ROOT.has(vanityMatch[1].toLowerCase());
      const shouldProxy = !shareUrl && (isPrefixMatch || isVanity);
      if (shouldProxy) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const proxy = new URL(`https://${projectId}.supabase.co/functions/v1/og-meta`);
        proxy.searchParams.set("path", url.pathname);
        if (url.searchParams.toString()) {
          proxy.searchParams.set("search", url.searchParams.toString());
        }
        return proxy.toString();
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  })();

  const currentUrl = cleanUrl;
  const shareTitle = title || (typeof document !== "undefined" ? document.title : "");
  const displayUrl = (() => {
    try {
      const u = new URL(currentUrl);
      return u.host + u.pathname.replace(/\/$/, "");
    } catch {
      return currentUrl;
    }
  })();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {
      const input = document.createElement("input");
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="h-6 w-6" />,
      url: `https://wa.me/?text=${encodeURIComponent(shareTitle + " " + currentUrl)}`,
      bg: "bg-[#25D366] text-white",
    },
    {
      name: "Facebook",
      icon: <FacebookIcon className="h-6 w-6" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
      bg: "bg-[#1877F2] text-white",
    },
    {
      name: "X",
      icon: <TwitterIcon className="h-5 w-5" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(currentUrl)}`,
      bg: "bg-black text-white",
    },
    {
      name: "LinkedIn",
      icon: <LinkedInIcon className="h-6 w-6" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
      bg: "bg-[#0A66C2] text-white",
    },
  ];

  const buttonColor =
    variant === "gold"
      ? "text-gold hover:text-gold/80"
      : variant === "light"
        ? "text-white/70 hover:text-white"
        : "text-muted-foreground hover:text-foreground";

  return (
    <>
      <div className={`relative inline-flex ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          className={`h-9 w-9 flex items-center justify-center rounded-full bg-muted transition-colors ${buttonColor} ${buttonClassName}`}
          aria-label="Partager"
          title="Partager"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Partager"
        >
          <div
            className="relative w-full max-w-md rounded-3xl text-foreground shadow-2xl p-6 animate-in zoom-in-95 fade-in-0"
            style={{ backgroundColor: "#CDBFA4" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Partager</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview card */}
            <div
              className="relative aspect-square w-full rounded-2xl overflow-hidden text-white p-6 flex flex-col items-center justify-end text-center mb-5 bg-neutral-900"
              style={previewImage ? { backgroundImage: `url(${previewImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            >
              {previewImage && <div className="absolute inset-0 bg-black/45" aria-hidden="true" />}
              {!previewImage && (
                <div className="relative h-20 w-20 rounded-full bg-white flex items-center justify-center overflow-hidden mb-3">
                  <img src={logoGold} alt="" className="h-16 w-16 object-contain" />
                </div>
              )}
              <div className="relative font-semibold text-base line-clamp-2 drop-shadow">{shareTitle}</div>
              <div className="relative text-xs text-white/80 mt-1 break-all line-clamp-1 drop-shadow">{displayUrl}</div>
            </div>

            {/* Share targets */}
            <div className="grid grid-cols-5 gap-3 mb-2">
              <button
                onClick={handleCopy}
                className="flex flex-col items-center gap-1.5 group"
                title="Copier le lien"
              >
                <span className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                  {copied ? <Check className="h-5 w-5 text-green-600" /> : <LinkIcon className="h-5 w-5" />}
                </span>
                <span className="text-[11px] text-foreground/70">{copied ? "Copié" : "Copier"}</span>
              </button>

              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col items-center gap-1.5 group"
                  title={link.name}
                >
                  <span className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${link.bg}`}>
                    {link.icon}
                  </span>
                  <span className="text-[11px] text-foreground/70">{link.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
