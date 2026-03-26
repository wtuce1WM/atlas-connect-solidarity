import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";
import { ExternalLink } from "lucide-react";

interface SocialPost {
  platform: string;
  post_url: string;
  sort_order: number;
}

interface SocialPostsCardProps {
  posts: SocialPost[];
  animationDelay?: string;
}

function getPlatformInfo(platform: string, url: string) {
  if (platform === "instagram" || /instagram\.com/i.test(url)) {
    return { icon: <InstagramIcon className="h-4 w-4" />, color: "#E4405F", label: "Reel" };
  }
  if (platform === "tiktok" || /tiktok\.com/i.test(url)) {
    return { icon: <TikTokIcon className="h-5 w-5" />, color: "#000000", label: "TikTok" };
  }
  if (platform === "pinterest" || /pinterest\.(com|fr)/i.test(url)) {
    return { icon: <PinterestIcon className="h-4 w-4" />, color: "#BD081C", label: "Pin" };
  }
  return { icon: <ExternalLink className="h-4 w-4" />, color: "#666", label: "Post" };
}

/** Extracts an Instagram Reel thumbnail URL from the post URL */
function getInstagramThumbnail(url: string): string | null {
  // Instagram doesn't expose thumbnails easily via URL — return null
  return null;
}

const SocialPostsCard = ({ posts, animationDelay = "0ms" }: SocialPostsCardProps) => {
  if (posts.length === 0) return null;

  return (
    <div
      className="snap-start shrink-0 w-fit rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 overflow-hidden flex flex-col animate-slide-in-left opacity-0"
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-center p-2">
        <div className="flex flex-col gap-1">
          {posts.map((post, idx) => {
            const info = getPlatformInfo(post.platform, post.post_url);
            return (
              <a
                key={`sp-${idx}`}
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center group"
                title={info.label}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg relative"
                  style={{ backgroundColor: info.color }}
                >
                  {info.icon}
                  {/* Small play triangle overlay */}
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                    <span className="text-[6px] text-white ml-[1px]">▶</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SocialPostsCard;
export type { SocialPost };
