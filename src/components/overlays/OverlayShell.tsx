import React from "react";

/**
 * Unified wrapper for all overlays inside the slide panel.
 *
 * WHY THIS EXISTS:
 * The slide panel's own toolbar is ~3.3rem tall. Overlays that need to
 * visually cover the toolbar extend upward with a negative top offset,
 * but their *content* (close button, header, body) must start at the
 * visible area — hence the matching top padding.
 *
 * This component centralises that logic so individual overlays never
 * need to manage `-top-[3.3rem]` / `pt-[3.3rem]` pairs themselves.
 *
 * PROPS:
 * - coverToolbar: extend behind the parent toolbar (default: true)
 * - desktopOnly:  only extend on lg+ breakpoints (default: true)
 *                 set to false when the overlay should always cover
 * - zClass:       z-index tailwind class (default: "z-[80]")
 * - animClass:    entry animation class (default: none)
 * - className:    extra classes forwarded to the outer div
 * - bg:           background class (default: none — set by children)
 */
interface OverlayShellProps {
  children: React.ReactNode;
  /** z-index class */
  zClass?: string;
  /** Entry animation class */
  animClass?: string;
  /** Extend behind the parent toolbar (default true) */
  coverToolbar?: boolean;
  /** Only apply toolbar offset on lg+ (default true). If false, always offset. */
  desktopOnly?: boolean;
  /** Background class */
  bg?: string;
  /** Additional classes on outer wrapper */
  className?: string;
  /** Ref sur le conteneur externe (utilisé pour l'animation morphée) */
  outerRef?: React.Ref<HTMLDivElement>;
  /** Repère DOM utilisé uniquement par la capture vidéo Feed. */
  "data-owm-video-overlay"?: boolean;
}

const TOOLBAR_H = "3.3rem";

const OverlayShell = ({
  children,
  zClass = "z-[80]",
  animClass = "",
  coverToolbar = true,
  desktopOnly = true,
  bg = "",
  className = "",
  outerRef,
  "data-owm-video-overlay": videoCaptureOverlay,
}: OverlayShellProps) => {
  // When NOT covering toolbar, simple absolute inset-0
  if (!coverToolbar) {
    return (
      <div ref={outerRef} data-owm-video-overlay={videoCaptureOverlay ? "true" : undefined} className={`absolute inset-0 ${zClass} overflow-hidden ${animClass} ${bg} ${className}`}>
        {children}
      </div>
    );
  }

  // When covering toolbar:
  // - Outer div extends upward (negative top)
  // - Inner div adds matching top padding so content stays visible
  const topOffset = desktopOnly ? "lg:-top-[3.3rem]" : "-top-[3.3rem]";
  const topPad = desktopOnly ? "lg:pt-[3.3rem]" : "pt-[3.3rem]";

  return (
    <div
      ref={outerRef}
      data-owm-video-overlay={videoCaptureOverlay ? "true" : undefined}
      className={`absolute inset-0 ${topOffset} ${zClass} overflow-hidden ${animClass} ${bg} ${className}`}
    >
      <div className={`w-full h-full ${topPad} flex flex-col`}>
        {children}
      </div>
    </div>
  );
};

export default OverlayShell;
