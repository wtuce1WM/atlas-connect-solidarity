# Project Memory

## Core
- **Tech Stack:** Supabase with RLS. **Hosted directly on Lovable** (NOT Vercel). Radix Select locked to 2.1.6. dnd-kit locked to 9.0.0.
- **Design Rules:** Dark theme. Typography: Montserrat (headings/names) and Avenir (body, fallback Nunito Sans). Colors: Terracotta (Primary), #25D366 (WhatsApp), #D4AF37 (Gold).
- **Component Rules:** NEVER nest a `<Checkbox />` inside a `<button>`. Recursively opened panels must use high z-indexes (z-85+).
- **URL Context:** Maintain search context via `window.history.replaceState`. Route `/fiche/:slug` redirects to `/search?openBusiness=ID`. Static `index.html` meta-tags are used for share previews.
- **Database Rules:** Never use `gamme_id` for booking/pricing. Booking strictly requires `min_price` or `manual_price_range`.
- **Blog cards:** Vignette d'un article dans /blog = 1ʳᵉ image de la 1ʳᵉ fiche listée dans l'article (= même image que le hero).

## Memories
- [Blog Card Thumbnail](mem://design/blog-card-thumbnail) — Vignettes /blog = 1ʳᵉ image de la 1ʳᵉ fiche de l'article (= hero)
- [Voice Overlay Scope](mem://constraints/voice-overlay-scope) — L'overlay vocal du PanelSearchBar reste contenu dans le slidepanel droit, jamais fullscreen ni portalisé vers body
- [Template vidéo feed](mem://features/video-feed-template) — Capture Playwright + manifest + Remotion pour générer une vidéo de feed /search en 720x1280 ou 1280x720
