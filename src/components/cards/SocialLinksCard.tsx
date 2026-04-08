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

const SocialLinksCard = ({
  facebook, instagram, tiktok, youtube, twitter, linkedin, pinterest, vimeo, whatsapp, snapchat,
  menuItems = [], language = "fr", onOpenUrl,
  animationDelay = "0ms",
}: SocialLinksCardProps) => {
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
    whatsapp && { name: "WhatsApp", url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, icon: <WhatsAppIcon className="h-4 w-4" />, color: "#25D366" },
  ].filter(Boolean) as SocialLink[];

  if (links.length === 0 && menuItems.length === 0) return null;

  return (
    <div
      className="snap-start shrink-0 w-fit rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 overflow-hidden flex flex-col animate-slide-in-left opacity-0"
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-center p-2">
        <div className="flex flex-col gap-1 items-center">
          {menuItems.map((m) => (
            <button
              key={m.id}
              onClick={() => onOpenUrl?.(m.url, m.name || (language === "en" ? "Menu" : "La Carte"))}
              className="w-full min-w-[5rem] rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors px-3 py-2"
            >
              <span className="text-[10px] text-white/90 text-center whitespace-nowrap" style={{ fontFamily: "'Roboto', sans-serif" }}>
                {m.name || (language === "en" ? "Menu" : "Carte")}
              </span>
            </button>
          ))}
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg"
                style={{ backgroundColor: link.color }}
              >
                {link.icon}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialLinksCard;
