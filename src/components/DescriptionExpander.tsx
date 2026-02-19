import { useRef, useState, useLayoutEffect } from "react";

interface DescriptionExpanderProps {
  html: string;
  isVerified?: boolean;
  collapsedHeight?: number; // px
  anchorId?: string; // scroll to this element when collapsing
}

export function DescriptionExpander({
  html,
  isVerified = false,
  collapsedHeight = 300,
  anchorId,
}: DescriptionExpanderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState<number>(collapsedHeight);
  const [isTall, setIsTall] = useState(false);

  useLayoutEffect(() => {
    if (contentRef.current) {
      const h = contentRef.current.scrollHeight;
      setFullHeight(h);
      setIsTall(h > collapsedHeight + 16);
    }
  }, [html, collapsedHeight]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    // Both expand and collapse scroll to the anchor
    if (anchorId) {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 420);
    }
  };

  const currentHeight = expanded ? fullHeight : collapsedHeight;

  return (
    <div>
      <div
        style={{ height: currentHeight, transition: "height 0.4s cubic-bezier(0.4,0,0.2,1)" }}
        className="relative overflow-hidden"
      >
        <div
          ref={contentRef}
          className={`leading-relaxed prose max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-a:text-primary [&_p:empty]:min-h-[1em] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 ${isVerified ? 'text-white/80 prose-headings:text-white prose-strong:text-white' : 'text-muted-foreground prose-headings:text-foreground'}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Fade overlay */}
        <div
          style={{ transition: "opacity 0.4s cubic-bezier(0.4,0,0.2,1)" }}
          className={`absolute inset-x-0 bottom-0 h-12 pointer-events-none ${isVerified ? 'bg-gradient-to-t from-black/70 to-transparent' : 'bg-gradient-to-t from-background to-transparent'} ${expanded || !isTall ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      {isTall && (
        <button
          onClick={handleToggle}
          className={`mt-2 text-sm font-semibold underline-offset-2 hover:underline transition-colors ${isVerified ? 'text-gold' : 'text-primary'}`}
        >
          {expanded ? "Réduire ▲" : "Lire la suite ▼"}
        </button>
      )}
    </div>
  );
}
