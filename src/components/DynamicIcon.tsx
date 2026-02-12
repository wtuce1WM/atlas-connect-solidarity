import React, { lazy, Suspense } from "react";
import { type LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

// Detect if a string is an emoji (not a Lucide icon name)
function isEmoji(str: string): boolean {
  // Emoji regex: matches common emoji patterns including flag sequences
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Regional_Indicator}{2})(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
  return emojiRegex.test(str);
}

// Convert PascalCase icon name (stored in DB) to kebab-case (used by dynamicIconImports)
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

interface DynamicIconProps extends Omit<LucideProps, "ref"> {
  /** Icon name in PascalCase (as stored in DB, e.g. "Stethoscope") */
  name: string;
  /** Fallback rendered while loading or if icon not found */
  fallback?: React.ReactNode;
}

const iconCache = new Map<string, React.LazyExoticComponent<React.ComponentType<Omit<LucideProps, "ref">>>>();

function getLazyIcon(kebabName: string) {
  if (!iconCache.has(kebabName)) {
    const importFn = dynamicIconImports[kebabName as keyof typeof dynamicIconImports];
    if (!importFn) return null;
    iconCache.set(kebabName, lazy(importFn));
  }
  return iconCache.get(kebabName)!;
}

const DynamicIcon = ({ name, fallback, ...props }: DynamicIconProps) => {
  // If the name is an emoji, render it directly as text
  if (isEmoji(name)) {
    const size = typeof props.size === 'number' ? props.size : 24;
    return (
      <span
        className={props.className}
        style={{ fontSize: size * 0.75, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}
        role="img"
      >
        {name}
      </span>
    );
  }

  const kebabName = toKebabCase(name);
  const LazyIcon = getLazyIcon(kebabName);

  if (!LazyIcon) {
    return <>{fallback ?? null}</>;
  }

  return (
    <Suspense fallback={fallback ?? <div style={{ width: props.size ?? 24, height: props.size ?? 24 }} />}>
      <LazyIcon {...props} />
    </Suspense>
  );
};

export default DynamicIcon;
