import { useState, useEffect } from "react";

interface LoadingScreenProps {
  /** When true, triggers the fade-out exit animation */
  exiting?: boolean;
  /** Called when the exit animation completes */
  onExited?: () => void;
}

const LoadingScreen = ({ exiting = false, onExited }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(10);
  const [opacity, setOpacity] = useState(1);

  // Animate progress bar (fast start, slow down near 70%)
  useEffect(() => {
    if (exiting) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 70) return prev + 0.3;
        if (prev >= 50) return prev + 1;
        return prev + 3;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [exiting]);

  // When exiting, jump to 100% then fade out
  useEffect(() => {
    if (!exiting) return;
    setProgress(100);
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 200);
    const exitTimer = setTimeout(() => {
      onExited?.();
    }, 500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, [exiting, onExited]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center"
      style={{
        opacity,
        transition: "opacity 300ms ease-out",
      }}
    >
      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: `${Math.min(progress, 100)}%`,
            transition: "width 150ms ease-out",
          }}
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
