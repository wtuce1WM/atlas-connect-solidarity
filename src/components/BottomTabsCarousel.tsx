import React, { useState, useRef } from "react";
import { MapPin, Play } from "lucide-react";

/* ────────────────────────────────────────────────
   Tab definition
   ──────────────────────────────────────────────── */
export interface TabDef {
  id: string;
  label: string;
  /** Red background when not active (YouTube style) */
  tabStyle?: "youtube";
}

/* ────────────────────────────────────────────────
   Tab Bar
   ──────────────────────────────────────────────── */
interface TabBarProps {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  if (tabs.length === 0) return null;
  return (
    <div className="shrink-0 overflow-x-auto scrollbar-hide pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 pt-2 pb-1">
      <div className="flex gap-1 w-max">
        <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-full transition-colors border border-transparent whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-black text-white"
                : tab.tabStyle === "youtube"
                  ? "bg-[#FF0000] text-white hover:bg-[#CC0000]"
                  : "bg-white/70 text-black hover:bg-white/80"
            }`}
            style={{
              fontFamily: "Josefin Sans, sans-serif",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontSize: "11px",
              lineHeight: "16px",
              padding: "6px 12px",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Tab Content Container (fixed height)
   ──────────────────────────────────────────────── */
interface TabContentContainerProps {
  children: React.ReactNode;
}

export function TabContentContainer({ children }: TabContentContainerProps) {
  return (
    <div className="shrink-0 h-[9.5rem] md:h-[12.5rem] lg:h-[17.5rem]">
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Scroll Rail (horizontal scroll container with spacers)
   ──────────────────────────────────────────────── */
interface TabScrollRailProps {
  children: React.ReactNode;
  /** gap between items — default "gap-2" */
  gap?: string;
}

export function TabScrollRail({ children, gap = "gap-2" }: TabScrollRailProps) {
  return (
    <div className="shrink-0 pointer-events-auto w-[calc(100%_+_2.5rem)] -ml-4 -mr-6 md:w-[calc(100%_+_3rem)] md:-ml-6 md:-mr-6 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory mt-2">
      <div className={`flex w-max ${gap} overflow-x-auto pb-1 scrollbar-hide`}>
        <div className="shrink-0 w-2 md:w-4" aria-hidden="true" />
        {children}
        <div className="shrink-0 w-6" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Standard Thumbnail Card
   (image + label below — for destinations, businesses, city videos)
   ──────────────────────────────────────────────── */
interface TabCardProps {
  /** Image URL or null for placeholder */
  imageUrl?: string | null;
  /** Label displayed below the image */
  label: string;
  /** Optional sublabel (e.g. rating) */
  sublabel?: React.ReactNode;
  /** Click handler (for div cards) */
  onClick?: () => void;
  /** If set, renders as <a> with this href */
  href?: string;
  /** Slide-in animation class */
  animationClass?: string;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Whether to apply animation */
  animate?: boolean;
  /** Custom overlay on the image (e.g. play button) */
  imageOverlay?: React.ReactNode;
  /** Prefix element before label (e.g. star icon) */
  labelPrefix?: React.ReactNode;
}

export function TabCard({
  imageUrl,
  label,
  sublabel,
  onClick,
  href,
  animationClass = "animate-slide-in-left opacity-0",
  animationDelay = 0,
  animate = false,
  imageOverlay,
  labelPrefix,
}: TabCardProps) {
  const className = `shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${
    animate ? animationClass : ""
  } cursor-pointer hover:border-white/30 transition-colors`;

  const style = animate
    ? { animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" as const }
    : undefined;

  const content = (
    <>
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            loading="lazy"
            decoding="async"
            className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover"
          />
        ) : (
          <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white/40" />
          </div>
        )}
        {imageOverlay}
      </div>
      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
        {labelPrefix}
        {label}
      </p>
      {sublabel && <div className="px-1.5 pb-1.5">{sublabel}</div>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} style={style} onClick={onClick}>
      {content}
    </div>
  );
}

/* ────────────────────────────────────────────────
   YouTube-Style Card
   (full-bleed image with scale, play button overlay, 
    title at bottom with gradient — matches YouTubeShortsCarousel)
   ──────────────────────────────────────────────── */
interface TabYouTubeCardProps {
  /** YouTube/Vimeo thumbnail URL */
  thumbnailUrl?: string | null;
  /** Native video URL for file preview */
  videoPreviewUrl?: string | null;
  /** Label overlaid at the bottom */
  label: string;
  onClick?: () => void;
  animationClass?: string;
  animationDelay?: number;
  animate?: boolean;
}

export function TabYouTubeCard({
  thumbnailUrl,
  videoPreviewUrl,
  label,
  onClick,
  animationClass = "animate-slide-in-left opacity-0",
  animationDelay = 0,
  animate = false,
}: TabYouTubeCardProps) {
  return (
    <div
      className={`flex-shrink-0 rounded-xl overflow-hidden relative cursor-pointer group/card transition-all w-44 h-[8.5rem] md:h-[11.5rem] lg:h-[16.5rem] ${
        animate ? animationClass : ""
      }`}
      style={
        animate
          ? { animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" as const }
          : undefined
      }
      onClick={onClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
        />
      ) : videoPreviewUrl ? (
        <video
          src={videoPreviewUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-white/10 flex items-center justify-center">
          <span className="text-2xl">▶</span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/card:bg-black/40 transition-colors">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
      </div>
      <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] leading-tight text-white font-medium bg-gradient-to-t from-black/80 to-transparent line-clamp-2">
        {label}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Video Thumbnail Card
   (standard card with play button overlay — for city videos / video docs)
   ──────────────────────────────────────────────── */
interface TabVideoCardProps {
  /** Thumbnail URL */
  thumbnailUrl?: string | null;
  /** Fallback: platform thumbnail (YouTube/Vimeo) */
  platformThumbnailUrl?: string | null;
  /** Label below */
  label: string;
  /** Optional sublabel */
  sublabel?: string;
  onClick?: () => void;
  animationClass?: string;
  animationDelay?: number;
  animate?: boolean;
  /** Optional price badge */
  priceBadge?: string;
}

export function TabVideoCard({
  thumbnailUrl,
  platformThumbnailUrl,
  label,
  sublabel,
  onClick,
  animationClass = "animate-slide-in-left opacity-0",
  animationDelay = 0,
  animate = false,
  priceBadge,
}: TabVideoCardProps) {
  const imgSrc = thumbnailUrl || platformThumbnailUrl;

  return (
    <div
      className={`shrink-0 w-44 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 ${
        animate ? animationClass : ""
      } cursor-pointer hover:border-white/30 transition-colors`}
      style={
        animate
          ? { animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" as const }
          : undefined
      }
      onClick={onClick}
    >
      <div className="relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={label}
            loading="lazy"
            decoding="async"
            className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] object-cover"
          />
        ) : (
          <div className="w-full h-[7rem] md:h-[10rem] lg:h-[15rem] bg-white/10 flex items-center justify-center">
            <span className="text-2xl">▶</span>
          </div>
        )}
        {priceBadge && (
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <span className="bg-gold text-black text-[10px] font-semibold rounded px-2 py-0.5 backdrop-blur-sm">
              Prix: {priceBadge}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-white text-center py-1.5 px-1 truncate">
        {label}
      </p>
      {sublabel && (
        <p className="text-[10px] text-white/60 text-center px-1 pb-1 truncate -mt-1">
          {sublabel}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Full composed component (convenience wrapper)
   ──────────────────────────────────────────────── */
export interface BottomTabConfig {
  id: string;
  label: string;
  tabStyle?: "youtube";
  renderContent: (animate: boolean, animationClass: string) => React.ReactNode;
}

interface BottomTabsCarouselProps {
  tabs: BottomTabConfig[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  hidden?: boolean;
}

export default function BottomTabsCarousel({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange: controlledOnTabChange,
  hidden = false,
}: BottomTabsCarouselProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id || "");
  const initialRef = useRef(true);

  const activeTab = controlledActiveTab ?? internalActive;
  const onTabChange = controlledOnTabChange ?? ((id: string) => {
    initialRef.current = false;
    setInternalActive(id);
  });

  if (hidden || tabs.length === 0) return null;

  const resolvedTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;
  const animate = initialRef.current;
  const animationClass = "animate-slide-in-left opacity-0";

  const handleTabChange = (id: string) => {
    initialRef.current = false;
    onTabChange(id);
  };

  return (
    <>
      <TabBar
        tabs={tabs}
        activeTab={resolvedTab}
        onTabChange={handleTabChange}
      />
      <TabContentContainer>
        {tabs.map((tab) =>
          tab.id === resolvedTab ? (
            <React.Fragment key={tab.id}>
              {tab.renderContent(animate, animationClass)}
            </React.Fragment>
          ) : null
        )}
      </TabContentContainer>
    </>
  );
}
