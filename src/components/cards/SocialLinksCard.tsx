import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, TwitterIcon, LinkedInIcon, PinterestIcon, VimeoIcon } from "@/components/staff/SocialMediaIcons";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
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
  animationDelay?: string;
}

const SocialLinksCard = ({
  facebook, instagram, tiktok, youtube, twitter, linkedin, pinterest, vimeo, whatsapp,
  animationDelay = "0ms",
}: SocialLinksCardProps) => {
  const links: SocialLink[] = [
    instagram && { name: "Instagram", url: instagram, icon: <InstagramIcon className="h-6 w-6" />, color: "#E4405F" },
    facebook && { name: "Facebook", url: facebook, icon: <FacebookIcon className="h-6 w-6" />, color: "#1877F2" },
    tiktok && { name: "TikTok", url: tiktok, icon: <TikTokIcon className="h-6 w-6" />, color: "#000000" },
    youtube && { name: "YouTube", url: youtube, icon: <YouTubeIcon className="h-6 w-6" />, color: "#FF0000" },
    twitter && { name: "X", url: twitter, icon: <TwitterIcon className="h-6 w-6" />, color: "#000000" },
    linkedin && { name: "LinkedIn", url: linkedin, icon: <LinkedInIcon className="h-6 w-6" />, color: "#0A66C2" },
    pinterest && { name: "Pinterest", url: pinterest, icon: <PinterestIcon className="h-6 w-6" />, color: "#BD081C" },
    vimeo && { name: "Vimeo", url: vimeo, icon: <VimeoIcon className="h-6 w-6" />, color: "#1AB7EA" },
    whatsapp && { name: "WhatsApp", url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, icon: <WhatsAppIcon className="h-6 w-6" />, color: "#25D366" },
  ].filter(Boolean) as SocialLink[];

  if (links.length === 0) return null;

  return (
    <div
      className="snap-start shrink-0 w-[20rem] rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 overflow-hidden flex flex-col animate-slide-in-left opacity-0"
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-3 gap-4">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg"
                style={{ backgroundColor: link.color }}
              >
                {link.icon}
              </div>
              <span className="text-[10px] text-white/70 group-hover:text-white transition-colors">
                {link.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialLinksCard;
