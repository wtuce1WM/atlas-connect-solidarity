# Audit — champs DB réellement utilisés pour la pertinence des recherches

Mesuré le 10/08/2026 sur `public.businesses` (192 colonnes) croisé avec le code de
`business-search`, `club-ai-chat`, `embed-ai-chat`, `embed-ai-chat-v2`, `_shared/ai-engine`, `ai-search-answer`.

Résultat brut : **95 colonnes référencées, 97 jamais référencées**. Mais ce chiffre est trompeur :
la grande majorité des 97 sont des champs d'UI, de liens ou de branding (`*_url`, `widget_bg_color`,
`kp_*`, `pdf_*`, réseaux sociaux, `logo_2_url`…) qui n'ont aucune vocation de pertinence.
L'audit utile est ci-dessous : signaux *sémantiques* exploités vs dormants.

## 1. Signaux de pertinence réellement exploités

| Signal | Où | Rôle |
|---|---|---|
| `main_category`, `categories[]` | business-search, tous les moteurs | filtre dur + résolution taxonomique |
| `services[]` | business-search, nearby | filtre / UNION avec badges |
| `keywords[]` | business-search (≈100 usages) | matching lexical, alias, fautes |
| `engagements[]` | business-search, route `engagement` | filtre RSE (post-filtre) |
| `badge_id` + `business_badges` | business-search, club-ai-chat | filtre badge (#Rooftop, #Authentique…) |
| `city`, `neighborhood`, `zone_*`, `latitude/longitude` | partout | géo, rayon, aliases quartiers |
| `priority_score`, `computed_rating`, `total_review_count` | ranking.ts | tri |
| `min_price`, `manual_price_range` | booking, pricing | filtre prix / affichage |
| `opening_hours`, `is_open_24h`, `vacation_dates` | opening | ouverture |
| taxonomies annexes | `subcategories`, `search_synonyms` (dont `commodity_filters`, `engagement_filters`), `search_intent_words`, `search_noise_words`, `services.keywords` | détection d'intention |

## 2. Signaux dormants — champs remplis, jamais utilisés pour la pertinence

Ils sont **affichés** (fiche, réponse IA) mais n'entrent ni dans le matching ni dans le scoring :

1. `description`, `description_en`, `description_ar` — sélectionnées puis seulement rendues.
   Seule exception : un `ilike` ponctuel dans `embed-ai-chat-v2` (nearby, non normalisé).
2. `hook_fr / hook_en / hook_ar` — idem : rendu uniquement.
3. `business_ai_texts` (jusqu'à 5 textes/établissement, titre + hook + 2000 car.) — jamais lus par
   la recherche. C'est le corpus le plus riche et le plus propre du système.
4. `business_menu_summaries` + `menu_summary`, `menu_summary_title` — un menu contient les plats,
   donc les requêtes « couscous », « tajine végétarien », « pastilla ».
5. `faq` — questions/réponses jamais indexées.
6. Badges vidéos : `business_youtube_video_badges`, `generic_video_badges`,
   `business_youtube_video_subcategories` — vocabulaire thématique déjà curé, invisible en recherche.
7. `languages` — « guide francophone », « anglais parlé » : impossible aujourd'hui.
8. `certification_metadata` (1 ligne aujourd'hui) et `affiliate_legal_documents` — signal de confiance
   non exploité.
9. `poi_description`, `poi_hook`, `destination_description`, `destination_hook`, `poi_radius_km`
   — contexte géo éditorial jamais lu par les moteurs.
10. `is_regulated_activity`, `is_master`, `account_type` — jamais pris en compte comme signal.

## 3. Ce qui n'existe pas et qu'on croit exister

- **Commodités / Logistique** : aucune colonne dédiée sur `businesses`. Ce sont des `services`
  (rattachés à une `subcategory`) plus les `commodity_filters` de `search_synonyms`. Donc la
  couverture dépend entièrement du remplissage de `services[]` par établissement.
- **Aucun index plein texte.** Pas de `tsvector`, pas de trigram sur `description`/`hook`.
  Toute recherche textuelle passe par `ilike %…%` sur des colonnes isolées.

## 4. Direction proposée

**Principe : ces champs entrent comme facteurs de ranking, jamais comme filtres durs** — même
logique que les points de vue (Koutoubia/Atlas) : la proximité ou une occurrence textuelle ne doit
pas éliminer, ni faire entrer un résultat hors catégorie.

1. **Corpus texte unifié par établissement** : `tsvector` français (weight A: name/hook,
   B: badges/services/keywords, C: description + textes IA, D: menu). Colonne générée +
   index GIN, rafraîchie par trigger. Un seul point de vérité, pas de `ilike` dispersés.
2. **Vocabulaire fermé pour le classifieur B** : lui fournir la liste réelle des catégories,
   services, badges (dont badges vidéos) au lieu de le laisser inventer `category: "piscine"`.
   Ça règle la régression V2 sans « validation de sortie » a posteriori.
3. **Langues, menus, certifications** exposés comme filtres explicites une fois indexés.
4. **Route `reviews` à deux modes** (à écrire dans le moteur partagé) :
   `scope=host` → synthèse des avis de l'établissement Master (réutiliser
   `generate-review-summary`) ; `scope=list` → classement des notes sur un ensemble de résultats.
   Le mode vient de la route, pas du modèle.

Ordre recommandé : 2 → 4 → 1 → 3. Le point 2 est le moins coûteux et corrige la régression V2
mesurée ; le point 1 est le vrai gain de pertinence mais demande une migration + trigger.
