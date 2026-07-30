# Contexte et historique — ne pas perdre la contextualisation

L'IA de Lovable a une fenêtre de contexte limitée. Sur un projet long et complexe, elle peut oublier des règles, des décisions ou des nuances passées. Ce fichier liste les règles de reprise pour éviter ce phénomène.

## Pourquoi le contexte se perd

- Les conversations très longues dépassent la fenêtre de contexte du modèle.
- Les outils et résultats intermédiaires ne sont pas toujours réinjectés dans la mémoire active.
- Une demande vague force l'IA à deviner plutôt qu'à se référer à une règle établie.
- Les allers-retours rapides sur plusieurs sujets peuvent écraser la priorité du moment.

## Règles de sauvegarde du contexte

1. **Règles durables = KB ou mémoire projet.** Toute préférence, contrainte ou décision d'architecture doit être écrite dans l'onglet Connaissances (KB) ou dans `mem://` du projet.
2. **Un seul sujet par message.** Mélanger bug + nouvelle fonction + question produit dans un même tour dilue le contexte.
3. **Reprendre un chantier : donner le fichier source de vérité.** Au début d'un message de reprise, indiquer le fichier, la fonction ou la route concernée.
4. **Copier-coller la règle pertinente.** Si une décision ancienne compte, citer la ligne ou le fichier KB plutôt que laisser l'IA la deviner.
5. **Pas de « tu sais, comme l'autre fois ».** Reformuler brièvement la décision ou l'exception, surtout s'il y a eu des exceptions.

## Comment reprendre une session efficacement

```text
Chantier : [nom du chantier en cours]
Fichier : [chemin exact]
État actuel : [ce qui est en place / ce qui marche]
Problème : [symptôme exact ou écart]
Attendu : [résultat précis]
Contrainte : [règle à respecter, issue du KB si possible]
```

## Ce qui ne doit pas être recalculé à chaque fois

- Les décisions de design : couleurs, typographies, règles de composants.
- Les règles métier : pas de `gamme_id` pour le prix, booking via `min_price` / `manual_price_range`.
- Les architectures partagées : moteur `/search`, `BlogArticleTemplate`, `Club AI`, `Studio Vidéo`.
- Les seuils éditoriaux : tu les donnes, l'IA ne les invente pas.

## En résumé

- **Historique** : aide, mais n'est pas fiable sur le long terme.
- **KB + mémoire** : la source de vérité stable.
- **Message de reprise** : précis, réancré, un seul sujet.

## Les 3 règles anti-fuite de crédits

Le poste de dépense principal n'est pas la formulation du prompt, c'est **la longueur du fil de discussion** : chaque message réinjecte tout l'historique avant même la première ligne de code.

1. **Un nouveau chat par chantier.** Studio Vidéo, Club AI, Blog Top 20, back-office → un thread séparé pour chacun. C'est le gain le plus important et le plus immédiat.
2. **Questions produit, méta ou arbitrage → ChatGPT / Claude.** Jamais dans le fil de build : elles alourdissent l'historique pour zéro ligne de code.
3. **Un fichier par message.** Si deux symptômes touchent deux fichiers différents (ex. un effet visuel dans `BusinessShowcase.tsx` et un bug d'ordre dans `StudioVideo.tsx`), ce sont deux messages — sinon l'agent relit deux gros fichiers en un seul tour.

### Exemple de fuite observée

Un message combinant « corrige l'effet Ken Burns sur 7 scènes » **et** « l'ordre de l'étape Offre n'est pas conservé » : deux causes racines, deux fichiers volumineux relus intégralement dans le même tour. Découpé en deux messages, chaque tour n'aurait chargé qu'un seul fichier.

---


# Crédits : runtime IA vs build mode

Il existe deux compteurs de crédits totalement distincts. Les confondre fait chercher des économies au mauvais endroit.

## 1. AI Runtime (~3,89 crédits / mois)

Ce sont les crédits consommés par **l'app en production**, quand un visiteur utilise une fonctionnalité IA :

- Chat IA du Club (`club-ai-chat`)
- Réponse IA dans `/search` (`ai-search-answer`)
- Assistant Embed (`embed-ai-chat`, `/embed/ask/:slug`)
- Génération de scénario Studio Vidéo (`video-scenario-generate`)
- Traductions, embeddings, suggestions sémantiques

Le modèle utilisé ici (ex. Gemini 3.6 Flash) n'influence **que** ce compteur. Il est déjà quasi nul : changer de modèle runtime ne fera économiser presque rien. À l'inverse, prendre un modèle plus cher côté runtime resterait marginal.

## 2. Build mode (~3 964,80 crédits / mois)

Ce sont les crédits consommés **pendant le développement**, à chaque message envoyé à l'agent Lovable :

- lecture des fichiers pour comprendre le contexte
- exploration/recherche dans le code
- écriture et réécriture de code
- vérifications, builds, corrections d'erreurs
- longueur de l'historique de conversation réinjecté

C'est **99 % du budget**. Tout gain réel vient d'ici.

## Conséquence pratique

| Levier | Effet sur les crédits |
|---|---|
| Changer le modèle IA de l'app | Quasi nul (runtime déjà à ~4 cr.) |
| Prompt précis + chemin de fichier exact | Fort (moins d'exploration) |
| Un seul sujet par message | Fort (moins de contexte relu) |
| Spécifier les valeurs SQL / seuils | Fort (pas d'aller-retour) |
| Faire valider un plan court avant code | Fort (pas de code jeté) |
| Bug avec repro exacte | Fort (pas de tâtonnement) |
| Conversations très longues | Négatif (historique relu à chaque tour) |

**Règle :** on n'optimise pas le modèle, on optimise la façon de demander.

---

# Cartographie des fichiers `.tsx`

Le projet compte environ **432 fichiers `.tsx`** : ~85 pages (une route chacune) et ~350 composants. Cette carte sert de référence pour donner à l'agent le **chemin exact** du fichier concerné dès le premier message — c'est le levier n°1 d'économie de crédits.

Principe d'organisation :

- `src/pages/` : une page = une route déclarée dans `src/App.tsx`.
- `src/components/` (racine) : composants transverses du front public (header, footer, cartes, recherche, overlays médias).
- `src/components/<domaine>/` : composants spécialisés par domaine métier (club, affiliate, staff, embed, blog, home…).
- `src/components/ui/` : primitives shadcn/Radix — **ne jamais les modifier** sauf demande explicite.

## Pages publiques principales

| Fichier | Route | Fonction |
|---|---|---|
| `pages/Index.tsx` / `Home.tsx` / `HomeMindtrip.tsx` | `/` | Page d'accueil, hero, tabs villes, sections dynamiques |
| `pages/SearchPage.tsx` | `/search` | Moteur de recherche principal (source de vérité du ranking) |
| `pages/BusinessDetail.tsx` | `/b/:slug` | Fiche établissement complète |
| `pages/FicheImmersive.tsx` | `/fiche/:slug` | Résolveur immersif → contexte `/search` |
| `pages/PublicBusinessProfile.tsx` | `/site/:slug` | Mini-site vitrine d'un établissement |
| `pages/CategoryPage.tsx` / `SubcategoryPage.tsx` / `ServicePage.tsx` | `/category/*`, `/subcategory/*`, `/service/*` | Pages taxonomie |
| `pages/DestinationPage.tsx` / `DestinationResolver.tsx` / `NeighborhoodPage.tsx` | `/destination/*`, `/neighborhood/*` | Pages géographiques |
| `pages/CityMap.tsx` / `AllBusinessesMap.tsx` | `/carte`, `/city/:city` | Cartes Google Maps |
| `pages/Blog.tsx` / `BlogPost.tsx` | `/blog`, `/blog/:slug` | Blog piloté par la base |
| `pages/EventsPage.tsx` | `/events` | Agenda événements |
| `pages/HotelSearch.tsx` | `/hotels` | Recherche hôtels + disponibilités |
| `pages/VideoFeed.tsx` | `/videos`, `/videos/:slug` | Feed vidéo vertical |
| `pages/Club.tsx` | `/club` | Espace Club membres + assistant IA |
| `pages/Join.tsx` / `Card.tsx` | `/join`, `/card` | Adhésion et carte de membre |
| `pages/EmbedAsk.tsx` | `/embed/ask/:slug` | Assistant IA embarquable (iframe partenaire) |
| `pages/Corporate.tsx` / `Mission.tsx` / `Contact.tsx` | `/corporate`, `/mission`, `/contact` | Pages institutionnelles |
| `pages/CGU.tsx` / `CGF.tsx` / `Confidentialite.tsx` / `Cookies.tsx` | légal | Mentions légales |
| `pages/Install.tsx` | `/install` | Installation PWA |
| `pages/VanityResolver.tsx` / `YouTubeChannelResolver.tsx` | `/:vanitySlug`, `/y/:slug` | Résolution d'URLs courtes |
| `pages/NotFound.tsx` | `*` | 404 |

Les pages d'articles éditoriaux dédiés (`BeachClubsMarrakech.tsx`, `StreetFoodMarrakech.tsx`, `FruitsDeMerEssaouira.tsx`, `LouerVillaComplexeHotelierMarrakech.tsx`, etc.) sont toutes montées sur le **même template partagé** `components/blog/BlogArticleTemplate.tsx` : on étend le template, on ne le duplique jamais.

## Pages affiliés (B2B) et Studio Vidéo

| Fichier | Route | Fonction |
|---|---|---|
| `pages/AffiliatesLogin.tsx` | `/affiliates` | Connexion espace partenaire |
| `pages/AffiliatesDashboard.tsx` | `/affiliates/dashboard` | Stats, graphiques, KPI de l'affilié |
| `pages/AffiliatePresence.tsx` | `/affiliates/presence` | Édition complète de la fiche (onglets) |
| `pages/BecomeAffiliate.tsx` | `/devenir-affilie` | Demande d'affiliation (crée un affilié inactif) |
| `pages/StudioVideo.tsx` | `/studio-video` | Studio Vidéo IA (mode établissement / corporate) |

## Pages back-office (`/staff/*`)

| Fichier | Route | Fonction |
|---|---|---|
| `pages/StaffLogin.tsx` | `/staff/login` | Authentification staff |
| `pages/StaffHub.tsx` | `/staff` | Point d'entrée / navigation |
| `pages/StaffBackoffice.tsx` | `/staff/backoffice` | Catalogue établissements, contenus |
| `pages/StaffMaster.tsx` | `/staff/master` | Réglages système + gestion des utilisateurs |
| `pages/StaffIA.tsx` | `/staff/ia` | Dashboard IA, suggestions Club et Embed |
| `pages/StaffCRM.tsx` | `/staff/crm` | Membres du Club, invités |
| `pages/StaffB2B.tsx` | `/staff/b2b` | Liste et gestion des affiliés |
| `pages/StaffBlog.tsx` | `/staff/blog` | Rédaction et publication des articles |
| `pages/StaffFront.tsx` | `/staff/front` | Structure du Front (catégories, ordre, vidéos) |
| `pages/StaffTranslations.tsx` | `/staff/translations` | Traductions FR / EN / AR |

## Composants transverses (`src/components/`)

| Fichier | Utilisé dans | Fonction |
|---|---|---|
| `Header.tsx`, `HeaderMenuContent.tsx`, `Footer.tsx` | toutes les pages publiques | En-tête, menu, pied de page |
| `SearchInput.tsx`, `SearchResultCard.tsx`, `SearchPagination.tsx` | `/search` | Saisie, rendu et pagination des résultats |
| `SearchSuggestionsDropdown.tsx`, `TextSuggestionsDropdown.tsx` | `/search`, header | Autocomplétion |
| `AISearchAnswer.tsx`, `AISuggestionCard.tsx` | `/search` | Réponse IA et suggestions |
| `FiltersOverlayFlow.tsx`, `MoreFiltersPopup.tsx`, `CityCategoryFilter.tsx` | `/search` | Filtres |
| `BusinessMap.tsx`, `PoiGoogleMap.tsx`, `GoogleMapEmbed.tsx`, `MapBusinessInfoCard.tsx` | cartes et panels | Rendu Google Maps |
| `BusinessCard.tsx`, `cards/*` | listes et fiche | Cartes établissement, contact, liens, menu |
| `slidepanel/*` | fiche immersive | En-tête, CTA, médias, promotions du panneau latéral |
| `overlays/*` | fiche immersive, `/search` | Overlays médias (YouTube, Spotify, PDF, vidéos, vols, dispo hôtels) |
| `BookingOverlay.tsx`, `BookOnlineSlidePanel.tsx`, `HotelAvailabilityOverlay.tsx`, `SerpApiHotelOverlay.tsx` | fiche, `/hotels` | Réservation et disponibilités |
| `FrontStructureNavBar.tsx`, `FrontStructureSubNavBar.tsx` | accueil, `/search` | Navigation Structure du Front |
| `AuthSessionSentinel.tsx`, `StaffRouteGuard.tsx` | global, `/staff/*` | Revalidation serveur de session et garde de route |
| `AnalyticsTracker.tsx` | global | Tracking interne + GA4 |
| `StudioVideoScenarioPanel.tsx`, `StudioVideoMediaPicker.tsx` | `/studio-video` | Aperçu du scénario, sélection des médias |
| `ScrollToTop.tsx`, `RouteTransition.tsx`, `LazyMount.tsx` | global | Comportements de navigation et perf |

## Composants par domaine

| Dossier | Nb | Utilisé dans | Fonction |
|---|---|---|---|
| `components/club/` | 13 | `/club` | Assistant IA du Club, auth, voyages, panneaux blog / carte / événements |
| `components/affiliate/` | 17 | `/affiliates/*` | Éditeurs de la fiche partenaire : contacts, images, horaires, avis, textes, offres, services, highlights, vidéos, outils/embed |
| `components/staff/` | 105 | `/staff/*` | Tout le back-office : dashboards, gestion catalogue, IA, blog, SEO, médias, utilisateurs, KB |
| `components/staff/video-assignment/` | 2 | `/staff/front` | Affectation de vidéos aux entités |
| `components/overlays/` | 18 | fiche et recherche | Surcouches médias et services externes |
| `components/slidepanel/` | 6 | fiche immersive | Blocs du panneau latéral |
| `components/home/` | 9 | `/` | Blocs d'accueil : tabs villes, toolbar, badges, panneau vidéo |
| `components/cards/` | 7 | fiche établissement | Cartes flip contact, liens, menu, carte |
| `components/embed/` | 2 | `/embed/ask/:slug` | Carrousel de résultats et widget météo de l'assistant embarqué |
| `components/blog/` | 1 | tous les articles | `BlogArticleTemplate.tsx`, template éditorial partagé |
| `components/video/`, `components/video-feed/` | 2 | `/videos` | Lecteur et template du feed vidéo |
| `components/icons/` | 3 | global | Icônes custom (WhatsApp, TikTok, Substack) |
| `components/ui/` | 48 | global | Primitives shadcn/Radix — ne pas modifier |

## Comment s'en servir dans un prompt

Mauvais : « le bouton de réservation ne marche pas ».

Bon :

```text
Chantier : réservation fiche établissement
Fichier : src/components/BookOnlineSlidePanel.tsx
Problème : le CTA n'apparaît pas si min_price est nul
Attendu : afficher le CTA si min_price OU manual_price_range est rempli
Contrainte : ne jamais utiliser gamme_id pour le prix
```

Le second prompt évite à l'agent d'explorer des dizaines de fichiers : c'est là que se fait l'économie.
