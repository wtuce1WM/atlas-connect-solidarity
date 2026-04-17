import React, { useEffect, useState } from "react";

interface Props {
  languages: string[];
  openBadgeInfo?: { text: string; isOpen: boolean } | null;
  getLangAlt: (lang: string) => string;
  getLangFlag: (lang: string) => React.ReactNode;
}

const FlagsRow = ({ languages, getLangAlt, getLangFlag }: Pick<Props, "languages" | "getLangAlt" | "getLangFlag">) => (
  <div className={`flex items-center flex-wrap justify-center gap-1 md:gap-2 py-1.5 px-3 md:px-3 shrink-0 ${languages.length > 5 ? 'md:max-w-none' : ''}`}>
    {languages.map((lang, i) => {
      const langAlt = getLangAlt(lang);
      return (
        <span
          key={i}
          className="group relative inline-flex items-center justify-center text-xl md:text-2xl leading-none cursor-help shrink-0"
          title={langAlt}
          aria-label={langAlt}
          role="img"
          tabIndex={0}
          style={{ filter: "drop-shadow(0 0 2px hsla(0,0%,0%,1)) drop-shadow(0 0 6px hsla(0,0%,0%,0.9)) drop-shadow(0 2px 12px hsla(0,0%,0%,0.7)) drop-shadow(0 4px 24px hsla(0,0%,0%,0.4))" }}
        >
          {getLangFlag(lang)}
          <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:text-xs">
            {langAlt}
          </span>
        </span>
      );
    })}
  </div>
);

const OpenBadge = ({ openBadgeInfo }: { openBadgeInfo: { text: string; isOpen: boolean } }) => (
  <div className={`flex items-center gap-1 rounded-full py-1 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${openBadgeInfo.isOpen ? "bg-[#25D366] text-white" : "bg-[#C04F17] text-white"}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
    {openBadgeInfo.text}
  </div>
);

export const MobileFlagsOpenBadgeAlternator = ({ languages, openBadgeInfo, getLangAlt, getLangFlag }: Props) => {
  const hasFlags = languages.length > 0;
  const hasBadge = !!openBadgeInfo?.text;
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!hasFlags || !hasBadge) return;
    const t = setInterval(() => setShowBadge((v) => !v), 2000);
    return () => clearInterval(t);
  }, [hasFlags, hasBadge]);

  return (
    <>
      {/* Desktop: only flags (badge stays in BusinessHeader) */}
      <div className="hidden md:block">
        {hasFlags && <FlagsRow languages={languages} getLangAlt={getLangAlt} getLangFlag={getLangFlag} />}
      </div>
      {/* Mobile: alternate flags & badge, or show whichever exists */}
      <div className="md:hidden flex items-center justify-center min-h-[2.25rem]">
        {hasFlags && hasBadge ? (
          showBadge ? <OpenBadge openBadgeInfo={openBadgeInfo!} /> : <FlagsRow languages={languages} getLangAlt={getLangAlt} getLangFlag={getLangFlag} />
        ) : hasFlags ? (
          <FlagsRow languages={languages} getLangAlt={getLangAlt} getLangFlag={getLangFlag} />
        ) : hasBadge ? (
          <OpenBadge openBadgeInfo={openBadgeInfo!} />
        ) : null}
      </div>
    </>
  );
};
