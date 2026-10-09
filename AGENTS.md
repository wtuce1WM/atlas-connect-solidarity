# Architecture Rules

- Showcase PWA icons use `businesses.logo_url` first, then the showcase hero and first business image, so every enabled business is branded dynamically without slug-specific additions.
- Keep the Home `EmbedAsk` instance mounted across FR/EN URL changes so the active AI thread and slidepanel survive language switching.
- Business vanity links initialize Home and its `EmbedAsk` panel from `openBusiness` on the first render to avoid transitional screens.
- Remotion media validation must accept worker-internalized `dl/` paths because render jobs download remote assets before composition.
- Showcase galleries reuse HScroll and FullscreenLightbox with a shared image index so thumbnails open their exact image without duplicating media viewers.
- Standalone viewer positioning uses shared CSS hooks: center header contacts inherit header padding, and availability results move with their actions, keeping both viewer paths aligned without changing browser layouts.
- Both full-description viewer headers use the shared full-description-header hook for standalone-only top safe-area padding, keeping their close controls outside the iOS status bar without altering browser layouts.
- Installed 1WM App resets to Home (assistant closed) on cold start and after 30+ min hidden, via a one-shot index.html script excluding /site/ and /~oauth, because iOS restores stale pages.
