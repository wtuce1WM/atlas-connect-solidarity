import { useEffect, useState } from "react";
import { HandPointer, Play } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileFeedSwipeCoach = ({ open }: { open: boolean }) => {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (!open || !isMobile) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, [open, isMobile]);

  if (!visible || !isMobile) return null;

  return (
    <div
      className="owm-feed-swipe-coach pointer-events-none absolute inset-0 z-[260] flex flex-col items-center justify-center bg-foreground/55 text-primary-foreground"
      aria-hidden="true"
    >
      <div className="relative mb-8 h-44 w-28 rounded-[1.65rem] border-[7px] border-current bg-primary-foreground/15 shadow-2xl">
        <div className="absolute left-1/2 top-0 h-3 w-12 -translate-x-1/2 rounded-b-xl bg-current" />
        <Play className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 fill-current stroke-[1.5]" />
        <HandPointer className="owm-feed-swipe-hand absolute -bottom-5 -right-16 h-24 w-24 fill-current stroke-foreground stroke-[1.2]" />
      </div>
      <p className="max-w-[19rem] px-4 text-center font-josefin text-[2rem] font-bold leading-[1.08]">
        Balayez vers le haut<br />pour voir plus
      </p>
    </div>
  );
};

export default MobileFeedSwipeCoach;