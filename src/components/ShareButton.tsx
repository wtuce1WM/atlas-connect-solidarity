import { useState, useEffect, useRef } from "react";
import { Share2, X, Check, Copy, Link as LinkIcon, QrCode, Download, MapPin, Globe } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { FacebookIcon, TwitterIcon, WhatsAppIcon, LinkedInIcon } from "@/components/staff/SocialMediaIcons";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";
import heroKoutoubiaAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
import hamsaIconAsset from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";

interface ShareButtonProps {
  /** Optional custom title for the share text. Defaults to document.title */
  title?: string;
  /** Optional custom URL to share (e.g. OG proxy URL). Defaults to window.location.href */
  shareUrl?: string;
  /** Optional preview image shown in the share modal (instead of the OWM logo) */
  previewImage?: string | null;
  /** Optional avatar image rendered in the round overlay on top of previewImage */
  avatarImage?: string | null;
  /** Button color variant */
  variant?: "light" | "dark" | "gold";
  className?: string;
  /** Extra classes applied to the trigger button itself */
  buttonClassName?: string;
  /** Optional profile data to render as a Linktree-style profile card */
  profileData?: {
    nickname: string;
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    city?: string | null;
    country?: string | null;
    description?: string | null;
    website?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    pinterest?: string | null;
    spotify?: string | null;
    soundcloud?: string | null;
  } | null;
}

const ShareButton = ({ title, shareUrl, previewImage, avatarImage, variant = "gold", className = "", buttonClassName = "", profileData = null }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

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
      // Skip the og-meta proxy for AI chat shares — they don't need a dynamic
      // OG preview and the proxy URL is ugly when copied/displayed.
      const isAiChat = url.searchParams.has("aiChat");
      const shouldProxy = !shareUrl && !isAiChat && (isPrefixMatch || isVanity);
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
    import("@/lib/analytics").then(({ trackEvent, trackAhaMoment }) => {
      trackEvent("share_complete", { method: "copy_link", url: currentUrl });
      trackAhaMoment("first_share", { method: "copy_link" });
    }).catch(() => {});

  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="h-6 w-6" />,
      url: `https://wa.me/?text=${encodeURIComponent(shareTitle.toUpperCase() + "\n" + currentUrl)}`,
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
          onClick={() => {
            setIsOpen(true);
            import("@/lib/analytics").then(({ trackEvent }) =>
              trackEvent("share_open", { title, url: shareUrl })
            ).catch(() => {});
          }}
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
            className="relative w-[98%] sm:w-[90%] max-w-lg rounded-3xl text-foreground shadow-2xl p-6 animate-in zoom-in-95 fade-in-0"
            style={{ backgroundColor: "#ECD6B8" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 h-10 w-10 flex items-center justify-center rounded-full bg-white hover:bg-neutral-100 text-black shadow-lg transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pr-12">
              <h2 className="text-lg font-semibold">Partager</h2>
            </div>

            {/* Preview card */}
            {profileData ? (
              <div
                className="relative min-h-[460px] w-full rounded-3xl overflow-hidden text-white p-6 flex flex-col items-center justify-between text-center mb-5"
                style={{
                  background: "linear-gradient(to bottom, #2b1c18, #120b0a)",
                }}
              >
                {/* Micro share icon at the top right of the card */}
                <div className="absolute top-4 right-4">
                  <span className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/90">
                    <Share2 className="h-4 w-4" />
                  </span>
                </div>

                <div className="flex flex-col items-center w-full mt-4">
                  {/* Avatar */}
                  <div className="h-24 w-24 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden mb-3 ring-2 ring-white/20 shadow-xl">
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-neutral-400">
                        {(profileData.nickname?.[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-bold tracking-tight text-white font-sans">
                    {profileData.first_name || profileData.last_name
                      ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim()
                      : profileData.nickname}
                  </h3>

                  {/* Nickname */}
                  <p className="text-xs text-neutral-400 mt-0.5">@{profileData.nickname}</p>

                  {/* Location */}
                  {(profileData.city || profileData.country) && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {[profileData.city, profileData.country].filter(Boolean).join(", ")}
                    </p>
                  )}

                  {/* Bio */}
                  {profileData.description && (
                    <p className="mt-3 text-[13px] leading-relaxed text-neutral-300 max-w-sm line-clamp-3">
                      {profileData.description}
                    </p>
                  )}

                  {/* Social Icons row */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    {[
                      { key: "instagram", color: "#E4405F", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                      { key: "youtube", color: "#FF0000", path: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                      { key: "tiktok", color: "#FFFFFF", path: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" },
                      { key: "facebook", color: "#1877F2", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                      { key: "twitter", color: "#FFFFFF", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                      { key: "linkedin", color: "#0A66C2", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                      { key: "pinterest", color: "#E60023", path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" },
                      { key: "spotify", color: "#1DB954", path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12C24 5.4 18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" },
                      { key: "soundcloud", color: "#FF5500", path: "M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .089-.035.104-.094l.21-1.282-.21-1.332c-.015-.057-.047-.094-.104-.094m1.79-1.065c-.067 0-.12.054-.127.113l-.215 2.378.215 2.283c.007.06.06.111.127.111.064 0 .12-.051.127-.111l.24-2.283-.24-2.378c-.007-.06-.063-.113-.127-.113m.899-.392c-.078 0-.14.063-.148.133l-.2 2.77.2 2.613c.007.07.07.127.148.127.075 0 .14-.057.148-.127l.225-2.613-.225-2.77c-.008-.07-.073-.133-.148-.133m.899-.275c-.09 0-.158.072-.166.152l-.182 3.197.182 2.923c.008.082.076.148.166.148.088 0 .158-.066.164-.148l.207-2.923-.207-3.197c-.006-.08-.076-.152-.164-.152m.901-.14c-.098 0-.18.081-.184.171l-.17 3.477.17 3.143c.004.09.086.164.184.164.096 0 .176-.074.184-.164l.19-3.143-.19-3.477c-.008-.09-.088-.171-.184-.171m.899.016c-.108 0-.195.09-.199.191l-.155 3.601.155 3.338c.004.101.091.185.199.185.109 0 .194-.084.2-.185l.176-3.338-.176-3.601c-.006-.101-.091-.191-.2-.191m.9-.154c-.12 0-.212.1-.217.21l-.142 3.946.142 3.468c.005.112.097.203.217.203.118 0 .212-.09.217-.203l.16-3.468-.16-3.946c-.005-.11-.099-.21-.217-.21m1.263-.61c-.04-.008-.082-.008-.122 0-.132 0-.235.108-.239.228l-.127 4.4.127 3.558c.004.118.107.221.239.221.13 0 .232-.103.238-.221l.143-3.558-.143-4.4c-.006-.12-.108-.228-.238-.228m.893-.028c-.145 0-.263.117-.268.249l-.12 4.579.12 3.611c.005.13.123.242.268.242.143 0 .26-.112.268-.242l.136-3.611-.136-4.579c-.008-.132-.125-.249-.268-.249m.9.183c-.156 0-.283.127-.287.268l-.104 4.546.104 3.611c.004.14.131.261.287.261s.28-.121.287-.261l.117-3.611-.117-4.546c-.007-.141-.131-.268-.287-.268m.899-.181c-.166 0-.3.137-.305.287l-.09 4.776.09 3.611c.005.15.139.275.305.275.164 0 .298-.125.305-.275l.103-3.611-.103-4.776c-.007-.15-.141-.287-.305-.287m2.707-.825c-.16 0-.307.058-.427.152a4.452 4.452 0 00-4.09-2.685c-.355 0-.703.058-1.03.153-.122.042-.155.085-.155.17v8.93c.003.09.074.163.164.171h5.538a2.31 2.31 0 002.325-2.31 2.31 2.31 0 00-2.325-2.581" }
                    ].map(({ key, color, path }) => {
                      const val = profileData[key];
                      if (!val) return null;
                      return (
                        <span key={key} style={{ color }} className="hover:scale-110 transition-transform cursor-pointer">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d={path} />
                          </svg>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div className="w-full space-y-2 mt-2">
                  {profileData.website && (
                    <div className="w-full rounded-2xl bg-white/5 py-3 px-4 text-center text-xs font-semibold border border-white/10 text-neutral-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-neutral-400" />
                        {profileData.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                    </div>
                  )}
                  <div className="w-full rounded-2xl bg-[#C9521E] py-3 px-4 text-center text-xs font-bold text-white shadow-md">
                    Un compte One World Morocco ?
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="relative aspect-square w-full rounded-2xl overflow-hidden text-white p-6 flex flex-col items-center justify-end text-center mb-5"
                style={
                  previewImage
                    ? { backgroundImage: `url(${previewImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundImage: `url(${heroKoutoubiaAsset.url})`, backgroundSize: "cover", backgroundPosition: "center" }
                }
              >
                {/* Léger voile sombre sur l'image de fond */}
                <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
                
                {avatarImage ? (
                  <div className="relative h-[104px] w-[104px] rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden mb-2 ring-2 ring-white/40 shadow-xl z-10">
                    <img src={avatarImage} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : !previewImage && (
                  <img src={hamsaIconAsset.url} alt="" className="relative h-[120px] w-[120px] object-contain mb-2 drop-shadow-xl z-10" />
                )}
                <div className="relative font-semibold text-base line-clamp-3 whitespace-pre-wrap drop-shadow z-10">{shareTitle}</div>
              </div>
            )}

            {/* Share targets */}
            <div className="grid grid-cols-6 gap-3 mb-2">
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

              <button
                onClick={() => setQrOpen(true)}
                className="flex flex-col items-center gap-1.5 group"
                title="QR Code"
              >
                <span className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                  <QrCode className="h-5 w-5" />
                </span>
                <span className="text-[11px] text-foreground/70">QR Code</span>
              </button>

              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setIsOpen(false);
                    import("@/lib/analytics").then(({ trackEvent, trackAhaMoment }) => {
                      trackEvent("share_complete", { method: link.name.toLowerCase(), url: currentUrl });
                      trackAhaMoment("first_share", { method: link.name.toLowerCase() });
                    }).catch(() => {});

                  }}
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

      {qrOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setQrOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="QR Code"
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white text-black shadow-2xl p-6 animate-in zoom-in-95 fade-in-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Scanner pour ouvrir</h2>
              <button
                onClick={() => setQrOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={qrRef} className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCodeSVG value={currentUrl} size={280} level="M" />
            </div>
            <div className="mt-3 text-xs text-black/60 break-all text-center line-clamp-2">{displayUrl}</div>
            <div className="mt-4 flex gap-2">
              <a
                onClick={(e) => {
                  e.preventDefault();
                  const svg = qrRef.current?.querySelector("svg");
                  if (!svg) return;
                  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `qr-${(shareTitle || "lien").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 h-10 rounded-full bg-black text-white flex items-center justify-center gap-2 text-sm font-medium hover:bg-black/85 transition-colors cursor-pointer select-none"
              >
                <Download className="h-4 w-4" /> Télécharger
              </a>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleCopy();
                }}
                className="flex-1 h-10 rounded-full bg-muted text-foreground flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted/80 transition-colors cursor-pointer select-none"
              >
                {copied ? <><Check className="h-4 w-4 text-green-600" /> Copié</> : <><Copy className="h-4 w-4" /> Copier le lien</>}
              </a>
            </div>
          </div>
        </div>
      )}
    </>

  );
};

export default ShareButton;
