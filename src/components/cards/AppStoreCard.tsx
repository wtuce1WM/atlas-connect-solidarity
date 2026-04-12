import React from "react";
import appStoreBadge from "@/assets/app-store-badge.webp";
import googlePlayBadge from "@/assets/google-play-badge.webp";

interface AppLink {
  type: "app_store" | "google_play";
  url: string;
}

interface AppStoreCardProps {
  links: AppLink[];
  animationDelay?: string;
}

export default function AppStoreCard({ links, animationDelay = "0ms" }: AppStoreCardProps) {
  if (links.length === 0) return null;

  return (
    <div
      className="snap-start shrink-0 w-auto mb-4 relative animate-slide-in-left opacity-0"
      style={{ animationFillMode: "forwards", animationDelay }}
    >
      <div className="rounded-2xl bg-black/40 backdrop-blur-sm p-4 text-white border border-white/10 flex flex-col items-center justify-center gap-4 h-[6.5em]">
        {links.map((link) => (
          <a
            key={link.type}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105"
          >
            <img
              src={link.type === "app_store" ? appStoreBadge : googlePlayBadge}
              alt={link.type === "app_store" ? "App Store" : "Google Play"}
              className="h-12 md:h-14 w-auto"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
