# Pré-rendu HTML+JSON-LD pour bots IA & moteurs

## Objectif

Servir aux bots (GPTBot, PerplexityBot, ClaudeBot, Googlebot, etc.) une version HTML statique riche (titre, description, JSON-LD, contenu textuel) au lieu du SPA React vide. Les humains continuent de voir le SPA normalement.

## Principe

Une edge function `bot-prerender` intercepte les requêtes et détecte le User-Agent :
- **Bot détecté** → renvoie HTML pré-rendu depuis la DB (titre, meta, JSON-LD, texte principal, liens internes)
- **Humain** → renvoie le SPA React classique (`index.html`)

Le routage se fait via un fichier `public/_headers` ou une règle Lovable côté hosting. Comme Lovable ne permet pas de rewrite au niveau CDN, on utilise une **approche hybride** :

1. Le SPA reste servi par défaut sur toutes les routes.
2. Une edge function `bot-prerender` expose des URLs publiques que les bots peuvent crawler directement via le sitemap.
3. Le sitemap pointe les bots vers `https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/bot-prerender?url=/fiche/xxx` — mais cette approche est fragile.

**Meilleure approche** : générer des `.html` statiques au build/nightly via GitHub Actions et les servir depuis `public/` — comme on fait déjà pour les fiches individuelles (`public/dar-fragrance/index.html`).

## Ce qui existe déjà

Le projet a déjà des fichiers HTML pré-rendus pour ~200+ fiches business dans `public/<slug>/index.html` avec :
- Meta tags complets (title, description, canonical, OG, Twitter)
- JSON-LD `LocalBusiness` (nom, image, geo, address, rating)
- Fallback `<noscript>` avec H1 + description
- Script JS qui hydrate le SPA pour les humains

**C'est exactement l'architecture recommandée.** Il ne manque que :
1. Étendre la couverture (blog articles, hubs catégories, quartiers)
2. Enrichir le JSON-LD (Restaurant/Hotel typé + FAQ + Review)
3. Régénérer automatiquement quand la DB change

## Plan d'exécution (3 étapes)

### Étape 1 — Auditer & enrichir les fiches existantes

Vérifier ce qu'on a :
- Combien de fiches business ont leur `public/<slug>/index.html` ?
- Quels champs manquent dans le JSON-LD actuel (Restaurant vs LocalBusiness, priceRange, openingHours, telephone, servesCuisine) ?
- Le script de génération existe-t-il ? Où ? (probablement un edge function ou script Node)

### Étape 2 — Étendre la couverture

Générer des `.html` statiques pour :
- **Articles blog** (`/blog/:slug`) → `Article` + `BlogPosting` JSON-LD
- **Hubs catégorie** (`/category/:cat`) → `CollectionPage` + liste des business
- **Hubs quartier** (`/neighborhood/:slug`) → `Place` + business associés
- **Hub destination** (`/destination/:slug`) → `TouristDestination`

### Étape 3 — Automatiser la régénération

Edge function `regenerate-static-pages` déclenchée :
- À la création/modification d'un business (trigger DB)
- Nightly via cron pour rafraîchir ratings/reviews
- Manuellement depuis le back-office

## Détails techniques

**Fichiers concernés** :
- `public/<slug>/index.html` (existant, pattern à réutiliser)
- Nouvel edge function `generate-static-page` (à créer)
- Nouvel edge function `regenerate-all-static-pages` (batch)
- Peut-être un bouton dans `/staff` pour déclencher la régénération

**JSON-LD à enrichir par type** :
- `Restaurant` : `servesCuisine`, `priceRange`, `menu`, `acceptsReservations`
- `Hotel`/`LodgingBusiness` : `starRating`, `amenityFeature`, `checkinTime`
- `TouristAttraction` : `isAccessibleForFree`, `publicAccess`
- Tous : `openingHoursSpecification`, `telephone`, `sameAs` (réseaux)

**Détection bot côté script d'hydratation** : déjà fait dans les fichiers existants (regex WhatsApp|facebookexternalhit|Googlebot|bingbot). À étendre : `GPTBot|PerplexityBot|ClaudeBot|Google-Extended|Applebot`.

## Question avant de lancer

Je propose de commencer par **Étape 1 — audit** : je lis les fichiers existants, je vérifie combien de fiches sont couvertes, quel est le script de génération, et ce qui manque dans le JSON-LD. Je te livre un état des lieux précis avant de coder quoi que ce soit.

OK pour cet audit d'abord, ou tu veux qu'on saute direct à l'Étape 2 (blog + hubs) ?
