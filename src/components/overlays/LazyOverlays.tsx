import React from "react";

/** Lazy-loaded heavy overlay components — only loaded on user interaction */
export const LazyDirectionsOverlay = React.lazy(() => import("@/components/DirectionsOverlay"));
export const LazyMosaicOverlay = React.lazy(() => import("@/components/MosaicOverlay"));
export const LazyPoiGoogleMap = React.lazy(() => import("@/components/PoiGoogleMap"));
export const LazyFullscreenLightbox = React.lazy(() => import("@/components/FullscreenLightbox"));
