# Architecture Rules

- EmbedAsk hotel counts, tiles and pagination use the same hotelResultView collection; explicit radii are scoped by message and cleared on a new availability search, preventing stale filtering and empty pagination.

- Both `build` and `build:dev` in package.json must keep `NODE_OPTIONS=--max-old-space-size=4096`; the Vite build OOMs (~3 GB heap) during minification without it.

- Legal pages and the immersive legal viewer share French content components; English translations preserve the same full documents, so the viewer never substitutes summaries for legal text.

- All maps and directions consume the shared GPS watch in useGeolocation; location pickers preserve GPS/manual source, while catalog coordinates remain region-clamped independently of real user-marker coordinates, to avoid frozen markers and duplicate watches.

- EventsSlidePanel renders in a document-body portal so Home's transformed assistant container cannot trap Agenda beneath the global header.

- Directions endpoint pins reuse PoiGoogleMap's label-marker factories so user and master markers stay visually consistent with the Map overlay.

- Showcase PWA icons use `businesses.logo_url` first, then the showcase hero and first business image, so every enabled business is branded dynamically without slug-specific additions.
- Keep the Home `EmbedAsk` instance mounted across FR/EN URL changes so the active AI thread and slidepanel survive language switching.
- Business vanity links initialize Home and its `EmbedAsk` panel from `openBusiness` on the first render to avoid transitional screens.
- Remotion media validation must accept worker-internalized `dl/` paths because render jobs download remote assets before composition.
- Showcase galleries reuse HScroll and FullscreenLightbox with a shared image index so thumbnails open their exact image without duplicating media viewers.
- Standalone viewer positioning uses shared CSS hooks (center header contacts, availability results, home hero bottom gutter): iOS safe-area compensation lives only in the standalone CSS block, so browser layouts stay unchanged.
- Home mobile hero keeps the bottom « Catégories » CTA on a single line and reserves no bottom spacer on mobile; the hero container's own bottom padding is the only gutter, so the question field and the suggestions CTA are never clipped.
- Both full-description viewer headers use the shared full-description-header hook for standalone-only top safe-area padding, keeping their close controls outside the iOS status bar without altering browser layouts.
- Installed 1WM App resets to Home (assistant closed) on cold start and after 30+ min hidden, via a one-shot index.html script excluding /site/ and /~oauth, because iOS restores stale pages.
- Showcase sites pick their layout from `business_showcase_site.template` via the registry in `src/components/showcase/templates.ts` (unknown values fall back to premium; `?template=` preview is honored only for staff/admin), so new templates are added without altering existing ones; the SQL check constraint must list every registry id.
