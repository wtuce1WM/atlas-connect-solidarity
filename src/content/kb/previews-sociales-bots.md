# Previews sociales pour `/b/:slug` — options

## Constat (juin 2026)

Le serveur Lovable sert le même `index.html` générique pour toutes les routes `/b/:slug`. Pourtant **WhatsApp affiche désormais correctement** l'image, le titre et la description du business.

**Raison** : WhatsApp génère désormais la preview **côté client** (WebView sur l'appareil) qui exécute le JS, attend l'hydratation React, puis lit `document.title` / `meta[og:*]` posés par `useSEO()`.

### Conséquences

- ✅ WhatsApp, iMessage récents, Telegram → preview business correcte.
- ❌ Facebook, LinkedIn, Slack, Discord, X/Twitter, Googlebot social → toujours la preview générique (leurs crawlers n'exécutent pas le JS).
- ⚠️ Fragile : si WhatsApp serre la vis (timeout, JS désactivé) ça casse sans préavis.

## Pour fixer **tous** les crawlers — deux options

### Option A — Edge function avec UA-sniffing (recommandée)

Une edge function publique qui :
1. Détecte le User-Agent (`facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Googlebot|…`).
2. Fetch `businesses` (name, city, description, images[0], hook_fr) depuis le slug.
3. Renvoie un HTML léger avec les bons `<title>`, `og:title`, `og:description`, `og:image`, `og:url`, `canonical` + `<meta http-equiv="refresh">` vers la vraie URL pour les humains.

Avantages :
- Toujours à jour (lit la DB live).
- Scale à l'infini, n'est appelée que par les bots.
- ~1 fichier, ~80 lignes.
- Aucun risque pour l'expérience humaine (SPA inchangé).

⚠️ **Point bloquant à vérifier** : Lovable héberge le frontend ; il faut un moyen de router `/b/:slug` vers la function selon le UA. Si Lovable ne le permet pas nativement, il faut un Cloudflare Worker en proxy devant `oneworldmorocco.com` (DNS → Cloudflare → Worker → Lovable). Faisable mais change l'infra.

### Option B — Prerender statique

Pré-générer un HTML par slug, avec OG tags inlinés.

Avantages : aucun hit DB sur le crawl.

Inconvénients :
- Doit être re-généré à chaque modif business (nom, image, description…).
- Pipeline build + invalidation cache + storage à maintenir.
- Lovable ne fait pas de build statique par slug → pipeline externe obligatoire.
- Risque de servir une page stale si l'invalidation foire.

## Verdict

**Option A** sauf si on monte à des **milliers de crawls/seconde** (gros média), ce qui n'est pas le cas.

## Décision actuelle

**Reportée.** WhatsApp marche déjà ; Facebook/LinkedIn/Slack/X restent en preview générique en attendant.
