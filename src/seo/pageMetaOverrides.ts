// Module-level cache of page meta overrides loaded from the DB.
// Updated by usePageMetaOverridesLoader (mounted once at app root) and consumed
// by resolveRouteMeta() / RouteSeo to override the static PAGE_META registry.

import type { PageMeta } from "./pageMeta";

export type PageMetaOverride = {
  route_pattern: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_type: string | null;
};

let cache: Record<string, PageMetaOverride> = {};
const listeners = new Set<() => void>();

export function setOverrides(rows: PageMetaOverride[]) {
  cache = {};
  for (const r of rows) cache[r.route_pattern] = r;
  listeners.forEach((l) => l());
}

export function getOverride(pattern: string): PageMetaOverride | undefined {
  return cache[pattern];
}

export function subscribeOverrides(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function mergeMeta(pattern: string, base: PageMeta): PageMeta {
  const o = cache[pattern];
  if (!o) return base;
  return {
    title: o.title || base.title,
    description: o.description || base.description,
    ogType: (o.og_type as PageMeta["ogType"]) || base.ogType,
    ogImage: o.og_image || base.ogImage,
  };
}
