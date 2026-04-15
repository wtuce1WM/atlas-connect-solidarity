import React, { lazy, Suspense, useEffect, useState } from "react";
import { type LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { IconType } from "react-icons";

// Detect if a string is an emoji (not a Lucide icon name)
function isEmoji(str: string): boolean {
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Regional_Indicator}{2})(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
  return emojiRegex.test(str);
}

// Map legacy/removed icon names to current Lucide equivalents
const ICON_ALIASES: Record<string, string> = {
  "ice-cream": "ice-cream-cone",
  "ice-cream-2": "ice-cream-bowl",
  "train": "train-front",
};

// Convert PascalCase icon name to kebab-case
function toKebabCase(name: string): string {
  const kebab = name
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([A-Z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return ICON_ALIASES[kebab] || kebab;
}

// ── Lucide lazy loading ──
const lucideCache = new Map<string, React.LazyExoticComponent<React.ComponentType<Omit<LucideProps, "ref">>>>();

function getLazyLucideIcon(kebabName: string) {
  if (!lucideCache.has(kebabName)) {
    const importFn = dynamicIconImports[kebabName as keyof typeof dynamicIconImports];
    if (!importFn) return null;
    lucideCache.set(kebabName, lazy(importFn));
  }
  return lucideCache.get(kebabName)!;
}

// ── React Icons lazy loading ──
const riCache = new Map<string, IconType>();

async function loadReactIcon(pack: string, name: string): Promise<IconType | null> {
  const key = `${pack}:${name}`;
  if (riCache.has(key)) return riCache.get(key)!;
  try {
    let mod: any;
    switch (pack) {
      case "fa6": mod = await import("react-icons/fa6"); break;
      case "md":  mod = await import("react-icons/md"); break;
      case "hi2": mod = await import("react-icons/hi2"); break;
      case "bs":  mod = await import("react-icons/bs"); break;
      case "ri":  mod = await import("react-icons/ri"); break;
      case "tb":  mod = await import("react-icons/tb"); break;
      case "gi":  mod = await import("react-icons/gi"); break;
      default: return null;
    }
    const icon = mod[name];
    if (typeof icon === "function") {
      riCache.set(key, icon as IconType);
      return icon as IconType;
    }
    return null;
  } catch {
    return null;
  }
}

/** Parse stored value: "fa6:FaHotel" → { pack: "fa6", name: "FaHotel" }, "Star" → { pack: "lucide", name: "Star" } */
function parseIconValue(val: string) {
  const idx = val.indexOf(":");
  if (idx > 0) return { pack: val.slice(0, idx), name: val.slice(idx + 1) };
  return { pack: "lucide", name: val };
}

// ── Component for react-icons ──
const ReactIconRenderer = ({ pack, iconName, className, size }: { pack: string; iconName: string; className?: string; size?: number }) => {
  const [Icon, setIcon] = useState<IconType | null>(() => riCache.get(`${pack}:${iconName}`) || null);

  useEffect(() => {
    if (Icon) return;
    loadReactIcon(pack, iconName).then(ic => { if (ic) setIcon(() => ic); });
  }, [pack, iconName, Icon]);

  if (!Icon) return <div style={{ width: size ?? 24, height: size ?? 24 }} />;
  return <Icon className={className} size={size ?? 24} />;
};

interface DynamicIconProps extends Omit<LucideProps, "ref"> {
  name: string;
  fallback?: React.ReactNode;
}

const DynamicIcon = ({ name, fallback, ...props }: DynamicIconProps) => {
  if (!name) return <>{fallback ?? null}</>;

  // Emoji
  if (isEmoji(name)) {
    const size = typeof props.size === "number" ? props.size : 24;
    return (
      <span
        className={props.className}
        style={{ fontSize: size * 0.75, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}
        role="img"
      >
        {name}
      </span>
    );
  }

  const { pack, name: iconName } = parseIconValue(name);

  // React Icons
  if (pack !== "lucide") {
    return <ReactIconRenderer pack={pack} iconName={iconName} className={props.className} size={typeof props.size === "number" ? props.size : 24} />;
  }

  // Lucide
  const kebabName = toKebabCase(iconName);
  const LazyIcon = getLazyLucideIcon(kebabName);

  if (!LazyIcon) return <>{fallback ?? null}</>;

  return (
    <Suspense fallback={fallback ?? <div style={{ width: props.size ?? 24, height: props.size ?? 24 }} />}>
      <LazyIcon {...props} />
    </Suspense>
  );
};

export default DynamicIcon;
