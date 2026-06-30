import { useState } from "react";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, TwitterIcon, LinkedInIcon, PinterestIcon, VimeoIcon, SnapchatIcon } from "@/components/staff/SocialMediaIcons";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

interface MenuEntry {
  id: string;
  name: string | null;
  url: string;
}

interface SocialLinksCardProps {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  pinterest?: string | null;
  vimeo?: string | null;
  whatsapp?: string | null;
  snapchat?: string | null;
  menuItems?: MenuEntry[];
  language?: string;
  onOpenUrl?: (url: string, title?: string) => void;
  animationDelay?: string;
}

const LABELS = {
  fr: { la_carte: "La Carte", carte: "Carte" },
  en: { la_carte: "Menu", carte: "Menu" },
  ar: { la_carte: "القائمة", carte: "القائمة" },
};

const SocialLinksCard = ({
  facebook, instagram, tiktok, youtube, twitter, linkedin, pinterest, vimeo, whatsapp, snapchat,
  menuItems = [], language = "fr", onOpenUrl,
  animationDelay = "0ms",
}: SocialLinksCardProps) => {
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;
  const [expanded, setExpanded] = useState(false);

  const links: SocialLink[] = [
    instagram && { name: "Instagram", url: instagram, icon: <InstagramIcon className="h-4 w-4" />, color: "#E4405F" },
    facebook && { name: "Facebook", url: facebook, icon: <FacebookIcon className="h-4 w-4" />, color: "#1877F2" },
    tiktok && { name: "TikTok", url: tiktok, icon: <TikTokIcon className="h-6 w-6" />, color: "#000000" },
    youtube && { name: "YouTube", url: youtube, icon: <YouTubeIcon className="h-4 w-4" />, color: "#FF0000" },
    twitter && { name: "X", url: twitter, icon: <TwitterIcon className="h-6 w-6" />, color: "#000000" },
    linkedin && { name: "LinkedIn", url: linkedin, icon: <LinkedInIcon className="h-6 w-6" />, color: "#0A66C2" },
    pinterest && { name: "Pinterest", url: pinterest, icon: <PinterestIcon className="h-4 w-4" />, color: "#BD081C" },
    vimeo && { name: "Vimeo", url: vimeo, icon: <VimeoIcon className="h-4 w-4" />, color: "#1AB7EA" },
    snapchat && { name: "Snapchat", url: snapchat, icon: <SnapchatIcon className="h-4 w-4" />, color: "#FFFC00" },
  ].filter(Boolean) as SocialLink[];

  if (links.length === 0 && menuItems.length === 0) return null;

  const totalItems = menuItems.length + links.length;
  const useTwoColumns = totalItems > 4;
  const visibleCount = menuItems.length > 0 ? Math.max(0, 3 - menuItems.length) : 3;
  const hasHidden = links.length > visibleCount;

  return (
    <div
      className={`snap-start shrink-0 w-fit flex flex-col animate-slide-in-left opacity-0 ${expanded ? '' : 'h-[6.5em] overflow-hidden'}`}
      style={{ animationDelay, animationFillMode: "forwards" }}
      onMouseEnter={() => hasHidden && setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-center justify-center p-2">
        <div className="flex flex-row items-center gap-2 flex-wrap">
          {links.map((link, i) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center group transition-all duration-300"
              style={{
                opacity: expanded ? 1 : undefined,
                transform: expanded ? 'translateY(0)' : undefined,
                transition: `opacity 300ms ease ${i * 50}ms, transform 300ms ease ${i * 50}ms`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg"
                style={{ backgroundColor: link.color }}
              >
                {link.icon}
              </div>
            </a>
          ))}
          {menuItems.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onOpenUrl?.(m.url, m.name || L.la_carte)}
              className="min-w-[5rem] h-10 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/50 transition-colors px-3"
              style={{
                opacity: expanded ? 1 : undefined,
                transform: expanded ? 'translateY(0)' : undefined,
                transition: `opacity 300ms ease ${(links.length + i) * 50}ms, transform 300ms ease ${(links.length + i) * 50}ms`,
              }}
            >
              <span className="text-[10px] text-white/90 text-center whitespace-nowrap" style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif" }}>
                {m.name || L.carte}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialLinksCard;
