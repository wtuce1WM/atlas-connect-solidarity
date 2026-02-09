import React, { lazy, Suspense } from "react";
import { type LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

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
