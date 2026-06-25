# Studio Vidéo — Worker de rendu

Le worker écoute la table `video_jobs` (Supabase) et rend chaque scénario via
Remotion (`StudioSignature`) avant de pousser le MP4 dans le bucket public
`studio-videos`.

## Pré-requis (machine de rendu)

- Node 20+
- ffmpeg dans le PATH
- `npm install` à la racine de `remotion/` pour disposer de Remotion CLI
- `npm install @supabase/supabase-js` dans `remotion/worker/`

## Variables d'environnement

| Nom                          | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `SUPABASE_URL`               | URL du projet Supabase                                   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Clé service_role (privée, jamais côté client)            |
| `REMOTION_ENTRY`             | Chemin vers `remotion/src/index.ts` (défaut `../src/index.ts`) |
| `REMOTION_COMPOSITION_ID`    | Id de la composition (défaut `studio-signature`)         |
| `POLL_INTERVAL_MS`           | Intervalle de polling (défaut 5000)                      |

## Déploiement

### Render.com (le plus simple)

1. Nouveau **Background Worker**, root `remotion/`.
2. Build : `npm install && cd worker && npm install`
3. Start : `node worker/worker.mjs`
4. Renseigner les variables d'environnement.

### Fly.io / Railway / VPS

Même principe : un processus long-running qui exécute `node worker/worker.mjs`.

## Pipeline

```
video_jobs (status=pending)
    ↓ pickJob (UPDATE → rendering)
    ↓ npx remotion render StudioSignature --props=<scenario_json>
    ↓ upload bucket studio-videos
    ↓ UPDATE video_jobs (status=done, output_url)
```

En cas d'erreur, le job passe en `status=error` avec `error_message` rempli.

## TODO côté Remotion

Créer `remotion/src/scenes/StudioSignature.tsx` qui consomme `scenario_json`
en props et compose les beats (hook, identity, signature, reviews,
cta_install). L'enregistrer dans `remotion/src/Root.tsx` sous l'id
`studio-signature`.
