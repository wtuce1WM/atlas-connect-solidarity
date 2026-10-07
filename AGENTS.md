# Architecture Rules

- Showcase PWA icons use `businesses.logo_url` first, then the showcase hero and first business image, so every enabled business is branded dynamically without slug-specific additions.
- Keep the Home `EmbedAsk` instance mounted across FR/EN URL changes so the active AI thread and slidepanel survive language switching.
- Business vanity links initialize Home and its `EmbedAsk` panel from `openBusiness` on the first render to avoid transitional screens.
- Remotion media validation must accept worker-internalized `dl/` paths because render jobs download remote assets before composition.
- Showcase galleries reuse HScroll and FullscreenLightbox with a shared image index so thumbnails open their exact image without duplicating media viewers.