import { useState, useRef, useEffect } from "react";
import { Share2, X, Check, Copy } from "lucide-react";
import { FacebookIcon, TwitterIcon, WhatsAppIcon, LinkedInIcon } from "@/components/staff/SocialMediaIcons";

interface ShareButtonProps {
  /** Optional custom title for the share text. Defaults to document.title */
  title?: string;
  /** Optional custom URL to share (e.g. OG proxy URL). Defaults to window.location.href */
  shareUrl?: string;
  /** Button color variant */
  variant?: "light" | "dark" | "gold";
  className?: string;
}

const ShareButton = ({ title, shareUrl, variant = "gold", className = "" }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const rawUrl = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
  // Strip internal cache-buster _t from shared URLs ; route /search via og-meta proxy
  // so social bots (WhatsApp, Facebook, etc.) get a dynamic OG preview.
  const cleanUrl = (() => {
    try {
      const url = new URL(rawUrl);
      url.searchParams.delete("_t");
      if (!shareUrl && url.pathname === "/search") {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const proxy = new URL(`https://${projectId}.supabase.co/functions/v1/og-meta`);
        proxy.searchParams.set("path", url.pathname);
        proxy.searchParams.set("search", url.searchParams.toString());
        return proxy.toString();
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  })();

  const currentUrl = cleanUrl;
  const shareTitle = title || (typeof document !== "undefined" ? document.title : "");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="h-4 w-4" />,
      url: `https://wa.me/?text=${encodeURIComponent(shareTitle + " " + currentUrl)}`,
      color: "hover:text-green-500",
    },
    {
      name: "Facebook",
      icon: <FacebookIcon className="h-4 w-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
      color: "hover:text-blue-600",
    },
    {
      name: "X",
      icon: <TwitterIcon className="h-4 w-4" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(currentUrl)}`,
      color: "hover:text-foreground",
    },
    {
      name: "LinkedIn",
      icon: <LinkedInIcon className="h-4 w-4" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
      color: "hover:text-blue-700",
    },
  ];

  const buttonColor =
    variant === "gold"
      ? "text-gold hover:text-gold/80"
      : variant === "light"
        ? "text-white/70 hover:text-white"
        : "text-muted-foreground hover:text-foreground";

  return (
    <div className={`relative inline-flex ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 w-9 flex items-center justify-center rounded-full bg-muted transition-colors ${buttonColor}`}
        aria-label="Partager"
        title="Partager"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-1 rounded-full bg-primary backdrop-blur-lg border border-primary-foreground/10 px-3 py-2 shadow-xl animate-in fade-in-0 zoom-in-95">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 rounded-full text-primary-foreground/80 transition-colors ${link.color}`}
              title={link.name}
              onClick={() => setIsOpen(false)}
            >
              {link.icon}
            </a>
          ))}
          <div className="w-px h-5 bg-primary-foreground/20 mx-1" />
          <button
            onClick={handleCopy}
            className="p-2 rounded-full text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            title="Copier le lien"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
