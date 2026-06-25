
# Studio Vidéo IA — Plan

Page front `/studio-video` (noindex, accessible à tous pour l'instant) pour générer des vidéos verticales 720x1280 de 17 à 30s à partir d'un prompt + sélection d'établissement.

## Architecture

```text
[Front /studio-video]
     │  prompt + business_id + durée (17/22/27s) + ton
     ▼
[Edge function: video-scenario-generate]
     │  Claude (Lovable AI Gateway) → JSON scénario
     │  Insert video_jobs (status=pending, scenario_json)
     ▼
[Worker externe (Render/Fly/Railway)]
     │  Poll video_jobs WHERE status=pending
     │  Render Remotion (template Signature paramétrique)
     │  Upload MP4 → storage bucket `studio-videos`
     │  Update video_jobs (status=done, output_url)
     ▼
[Front] Realtime sur video_jobs → affiche progression + lecteur MP4
```

## Étapes

### 1. Base de données
- Table `video_jobs` : id, user_id (nullable), business_id, prompt, duration_sec, tone, scenario_json, status (pending/rendering/done/error), output_url, error_message, created_at, updated_at.
- Bucket public `studio-videos`.
- RLS : lecture publique des jobs `done` ; insert ouvert (tout le monde pour l'instant) ; update réservé au service_role (worker).
- GRANT explicites (anon/authenticated/service_role).

### 2. Edge function `video-scenario-generate`
- Entrée : `{ prompt, business_id, duration_sec, tone }`.
- Charge la fiche établissement (hook, popup, offres, avis, médias internes triés par sort_order).
- Appelle Claude via Lovable AI Gateway → JSON beats structuré (timeline, textes, médias choisis).
- Insère un `video_jobs` (status=pending) et retourne son id.

### 3. Template Remotion paramétrique
- `remotion/src/StudioSignature.tsx` : un seul composant qui consomme le JSON scénario (props) et compose les beats du template "Signature 27s" déjà éprouvé (hook, identité, signature, avis, CTA install).
- Durées ajustables 17/22/27s.

### 4. Worker de rendu (externe, simple)
- Petit service Node lisant `video_jobs` toutes les 5s.
- Télécharge les médias, lance `npx remotion render` avec props JSON, upload sur bucket, met à jour le job.
- Déployable sur Render/Fly/Railway (~5–10 €/mois). Documenté dans un README dédié — déploiement manuel à part par l'utilisateur.

### 5. Front `/studio-video`
- Route ajoutée + `<meta name="robots" content="noindex">`.
- Formulaire guidé : sélecteur établissement (autocomplete businesses actifs), durée (17/22/27), ton (immersif/dynamique/élégant), zone prompt libre.
- Bouton "Générer" → appelle edge function, écoute Supabase Realtime sur le job, affiche statut + preview MP4 + bouton télécharger.
- Galerie des derniers jobs `done`.

## Détails techniques

- Auth : non requise pour l'instant (tout le monde). Le `user_id` reste optionnel pour pouvoir restreindre plus tard.
- Coût IA : ~0,02–0,05 € par scénario Claude.
- Le worker externe doit être déployé manuellement (hors sandbox Lovable). Je fournis le code + README.
- Pas de rendu Lambda dans cette V1 — ajout possible en V2.

## Hors scope V1
- Quotas, rate-limit utilisateur, paiement.
- Re-render en 1 clic après tweak (faisable facilement plus tard).
- Authentification staff (à activer quand vous voudrez restreindre).
