import React from "react";

/**
 * Shared wrapper for slide-up overlays that cover the parent panel + toolbar.
 * Provides consistent z-index, animation, and negative top offset.
 */
interface OverlayShellProps {
  children: React.ReactNode;
  /** z-index class (default: z-[80]) */
  zClass?: string;
  /** Animation class (default: animate-slide-up-from-bottom) */
  animClass?: string;
  /** Whether to apply the negative top offset to cover toolbar (default: true) */
  coverToolbar?: boolean;
  /** Additional classes */
  className?: string;
}

const OverlayShell = ({
  children,
  zClass = "z-[80]",
  animClass = "animate-slide-up-from-bottom",
  coverToolbar = true,
  className = "",
}: OverlayShellProps) => (
  <div
    className={`absolute inset-0 ${coverToolbar ? "-top-[3.3rem]" : ""} ${zClass} overflow-hidden ${animClass} ${className}`}
  >
    {children}
  </div>
);

export default OverlayShell;
