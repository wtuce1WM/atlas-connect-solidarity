import { ReactNode } from "react";

interface PhoneMockupFrameProps {
  children: ReactNode;
  className?: string;
  frameColor?: "dark" | "light" | "terracotta";
  screenAspect?: string; // e.g. "9 / 16" or "16 / 9"
}

const frameColorStyles: Record<NonNullable<PhoneMockupFrameProps["frameColor"]>, { outer: string; inner: string; notch: string; button: string; home: string; speaker: string; camera: string }> = {
  dark: {
    outer: "bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_25px_60px_-12px_rgba(0,0,0,0.5)]",
    inner: "bg-black",
    notch: "bg-[#1a1a1a]",
    button: "bg-[#1a1a1a]",
    home: "bg-white/20",
    speaker: "bg-[#2a2a2a]",
    camera: "bg-[#2a2a2a]",
  },
  light: {
    outer: "bg-[#e8e8e8] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_25px_60px_-12px_rgba(0,0,0,0.35)]",
    inner: "bg-black",
    notch: "bg-[#e8e8e8]",
    button: "bg-[#d4d4d4]",
    home: "bg-black/20",
    speaker: "bg-[#bdbdbd]",
    camera: "bg-[#bdbdbd]",
  },
  terracotta: {
    outer: "bg-[#C45C3E] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_25px_60px_-12px_rgba(0,0,0,0.5)]",
    inner: "bg-black",
    notch: "bg-[#C45C3E]",
    button: "bg-[#A34A30]",
    home: "bg-white/25",
    speaker: "bg-[#D97A5A]",
    camera: "bg-[#D97A5A]",
  },
};

/**
 * CSS-only iPhone-style mockup frame.
 * The screen area uses `screenAspect` (default 9/16) so vertical videos fill it
 * without black bars. The child is absolutely stretched into the screen.
 */
const PhoneMockupFrame = ({
  children,
  className = "",
  frameColor = "dark",
  screenAspect = "9 / 16",
}: PhoneMockupFrameProps) => {
  const c = frameColorStyles[frameColor];

  return (
    <div className={`relative mx-auto ${className}`} style={{ width: "min(100%, 420px)" }}>
      {/* Side buttons */}
      <div className={`absolute -left-[2px] top-[18%] w-[3px] h-[40px] rounded-l-sm ${c.button}`} />
      <div className={`absolute -left-[2px] top-[28%] w-[3px] h-[70px] rounded-l-sm ${c.button}`} />
      <div className={`absolute -right-[2px] top-[24%] w-[3px] h-[70px] rounded-r-sm ${c.button}`} />

      {/* Outer frame */}
      <div
        className={`relative ${c.outer} p-[10px] rounded-[40px]`}
        style={{ paddingTop: "10px", paddingBottom: "10px" }}
      >
        {/* Inner screen */}
        <div
          className={`relative ${c.inner} overflow-hidden rounded-[32px]`}
          style={{ aspectRatio: screenAspect }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 h-[26px] w-[40%] min-w-[110px] rounded-b-[14px] flex items-center justify-center gap-2">
            <div className={`${c.notch} absolute inset-0 rounded-b-[14px]`} />
            <div className={`relative w-[34px] h-[4px] rounded-full ${c.speaker}`} />
            <div className={`relative w-[6px] h-[6px] rounded-full ${c.camera}`} />
          </div>

          {/* Content */}
          <div className="absolute inset-0 z-10 overflow-hidden">
            {children}
          </div>

          {/* Bottom home indicator */}
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[35%] h-[4px] rounded-full ${c.home}`} />
        </div>
      </div>
    </div>
  );
};

export default PhoneMockupFrame;
