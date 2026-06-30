import { useRef, useState, useLayoutEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DescriptionExpanderProps {
  html: string;
  isVerified?: boolean;
  collapsedHeight?: number; // px
  anchorId?: string; // scroll to this element when collapsing
}

const LABELS = {
  fr: { expand: "Lire la suite ▼", collapse: "Réduire ▲" },
  en: { expand: "Read more ▼", collapse: "Show less ▲" },
  ar: { expand: "اقرأ المزيد ▼", collapse: "طيّ ▲" },
};

export function DescriptionExpander({
  html,
  isVerified = false,
  collapsedHeight = 300,
  anchorId,
}: DescriptionExpanderProps) {
  const { language } = useLanguage();
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;

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
    // Only scroll to anchor when collapsing
    if (!next && anchorId) {
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
          className={`leading-relaxed prose max-w-none prose-josefin-headings prose-h2:text-xl prose-h3:text-lg prose-a:text-primary [&_p:empty]:min-h-[1em] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0 [&_li>p]:mb-0 [&_table]:border-collapse [&_table]:w-full [&_table]:table-fixed [&_td]:border [&_td]:border-border [&_td]:p-4 [&_td]:align-top [&_td]:text-xs [&_td_img]:w-full [&_td_img]:h-36 [&_td_img]:min-h-[9rem] [&_td_img]:max-h-[9rem] [&_td_img]:object-cover [&_td_img]:rounded-md [&_td_img]:block [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_iframe]:max-w-full [&_iframe]:rounded-md [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_hr]:border-border ${isVerified ? 'text-white/80 prose-headings:text-white prose-strong:text-white [&_mark]:bg-yellow-500/40 [&_blockquote]:border-white/30 [&_td]:border-white/20 [&_th]:border-white/20 [&_th]:bg-white/10 [&_hr]:border-white/20' : 'text-muted-foreground prose-headings:text-foreground'}`}
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
          {expanded ? L.collapse : L.expand}
        </button>
      )}
    </div>
  );
}
