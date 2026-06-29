# Dashboard Analytics Partenaire — `business_events`

Tracker en interne tous les events liés à un établissement, pour offrir à chaque affilié un dashboard temps réel sur la performance de sa fiche, indépendant de GA4.

## Phase 1 — Schéma DB

Nouvelle table `public.business_events` :

| Colonne | Type | Détail |
|---|---|---|
| `id` | bigint identity | PK |
| `business_id` | uuid | FK → businesses(id), indexé |
| `event_type` | text | `view`, `whatsapp_click`, `phone_click`, `email_click`, `directions_click`, `affiliate_click`, `bookmark_add`, `share_open`, `share_complete`, `booking_intent`, `video_play`, `document_open` |
| `event_subtype` | text NULL | ex: `booking`, `getyourguide`, `tiktok` |
| `user_id` | uuid NULL | si connecté |
| `session_id` | text | id session anonyme (localStorage) |
| `source_page` | text | path de la page d'origine |
| `referrer_domain` | text NULL | |
| `device` | text | mobile/tablet/desktop |
| `country` | text NULL | dérivé IP côté edge |
| `city` | text NULL | |
| `meta` | jsonb | payload libre (link_url, position, etc.) |
| `created_at` | timestamptz default now() | indexé desc |

Index composé : `(business_id, event_type, created_at desc)` + `(business_id, created_at desc)`.

RLS :
- `INSERT` ouvert à `anon` + `authenticated` (logging public)
- `SELECT` : `service_role` only — jamais lu côté client direct
- Lectures uniquement via RPC `get_business_analytics(business_id, range)` qui vérifie `is_staff()` OU propriété affiliée via `is_own_affiliate_business()`

Vue matérialisée optionnelle `business_events_daily` (refresh horaire) pour agréger : 1 ligne par (business_id, day, event_type) → réponses <50ms même avec millions d'events.

## Phase 2 — Ingestion

Edge function `log-business-event` :
- POST batch (jusqu'à 20 events) pour réduire requêtes
- Enrichit avec `country`/`city` via header Cloudflare/x-forwarded
- Anti-spam : rate limit par IP (60/min) + dedupe `view` même session/business sous 30 min
- Validation Zod stricte

Côté front : helper `trackBusinessEvent(business_id, type, meta)` dans `src/lib/businessAnalytics.ts`
- File d'attente locale, flush toutes les 2s ou au `pagehide`
- Émet **en plus** des events GA4 existants (pas de remplacement)

Instrumentation :
- `view` : à l'ouverture d'une fiche (slide panel, page dédiée, popup)
- `whatsapp_click`, `phone_click`, `email_click` : déjà détectés dans `AnalyticsTracker` → ajouter call si un `business_id` est résolvable (data-attribute ou contexte)
- `bookmark_add` : dans `BookmarkButton`
- `share_open/complete` : dans `ShareButton`
- `directions_click`, `affiliate_click` : via data-attribute sur les `<a>` concernés
- `video_play`, `document_open` : depuis les slide panels existants

## Phase 3 — RPC d'agrégation

`get_business_analytics(p_business_id uuid, p_range text)` security definer :
- `p_range` : `7d` / `30d` / `90d` / `12m`
- Retourne JSON :
  ```json
  {
    "totals": { "views": 1234, "whatsapp": 87, "phone": 22, ... },
    "conversion_rate": 0.08,
    "timeseries": [{ "day": "2026-06-20", "views": 45, "intents": 6 }, ...],
    "by_source_page": [...],
    "by_country": [...],
    "by_device": [...],
    "top_referrers": [...]
  }
  ```
- Source : `business_events_daily` si range > 7j, sinon table brute
- Cache HTTP 5 min via header `Cache-Control`

## Phase 4 — UI Dashboard Partenaire

Nouvelle route `/affilie/:slug/analytics` (ou onglet "Statistiques" dans l'espace affilié existant).

Composants :
- **KPI cards** : Vues, Clics WhatsApp, Appels, Itinéraires, Réservations → variation vs période précédente
- **Sparkline 30j** sur chaque KPI
- **Graphique principal** : vues vs intentions (line chart, recharts)
- **Taux de conversion** vue → intention commerciale
- **Top sources** : pages internes qui amènent du trafic vers la fiche
- **Carte / liste pays** des visiteurs
- **Sélecteur période** : 7j / 30j / 90j / 12m
- **Export CSV** des events bruts (optionnel)

Accès :
- Affilié connecté qui possède le `business_id` (vérif via `is_own_affiliate_business`)
- Staff/Admin : accès à n'importe quelle fiche depuis le back-office

## Phase 5 — Rétention & coûts

- Job pg_cron quotidien : supprime les events bruts > 90 jours (les daily restent)
- Daily conservé 24 mois
- Volume estimé : ~1M events/mois max → coût Lovable Cloud négligeable

## Détails techniques

- Stack : Supabase (PG + Edge Functions Deno), Zod, React Query, Recharts
- 1 migration (table + index + RLS + GRANTs + RPC + cron)
- 1 edge function `log-business-event`
- 1 hook `useBusinessAnalytics(business_id, range)`
- 1 page dashboard + 4-5 composants chart
- Helper d'instrumentation réutilisable
- Modifs ciblées dans `BookmarkButton`, `ShareButton`, slide panels, `AnalyticsTracker` pour relier events GA4 → events internes quand business_id présent

## Hors scope (à valider ensuite)

- Notifications email hebdo automatiques aux affiliés (récap perf)
- Comparaison vs moyenne catégorie/ville ("Top 10% de Marrakech")
- Funnel multi-étapes vue → intent → booking confirmé (nécessite tracking côté partenaire externe)
- A/B test contenu de fiche

Dis-moi si je lance la Phase 1+2 (DB + ingestion) ou si tu veux ajuster le périmètre avant.