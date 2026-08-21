import { Youtube } from "lucide-react";
import { InstagramIcon } from "@/components/staff/SocialMediaIcons";
import { TikTokIcon as SiTiktok } from "@/components/icons/TikTokIcon";

export interface VideoSocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

/** Extract the social platform/account/url attached to a video doc (own or linked). */
export function getVideoSocial(doc: any): VideoSocialInfo | null {
  if (!doc) return null;
  if (doc.instagram_account) {
    return { platform: "instagram", account: doc.instagram_account, url: doc.instagram_url || null };
  }
  if (doc.tiktok_account) {
    return { platform: "tiktok", account: doc.tiktok_account, url: doc.tiktok_url || null };
  }
  if (doc.youtube_account) {
    return { platform: "youtube", account: doc.youtube_account, url: doc.youtube_url || null };
  }
  return null;
}

interface Props {
  social: VideoSocialInfo | null;
  /** Unique key source so the animation replays on media change */
  animKey?: string;
}

/** Platform logo + "Follow @account" badge, shown above the availability / fallback hotels block. */
const VideoSocialBadge = ({ social, animKey }: Props) => {
  if (!social) return null;
  return (
    <div
      key={`credit-social-${animKey || social.account}`}
      className="shrink-0 flex flex-col items-center justify-center gap-2 px-4 pb-3 pointer-events-none"
    >
      {social.platform === "instagram" && <InstagramIcon className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
      {social.platform === "tiktok" && <SiTiktok className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
      {social.platform === "youtube" && <Youtube className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
      {social.url ? (
        <a
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-2.5 py-1 pointer-events-auto hover:bg-black/80 transition-colors"
        >
          <span className="text-[11px] font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Follow @{social.account}
          </span>
        </a>
      ) : (
        <div className="flex items-center gap-2 rounded-full bg-black border border-white/15 px-2.5 py-1">
          <span className="text-[11px] font-medium text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Follow @{social.account}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoSocialBadge;
