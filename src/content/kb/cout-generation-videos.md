# Coût de génération vidéo (Remotion + IA)

Estimation pour **1 000 vidéos** verticales 720×1280, de 15 à 60 s, avec clips internes ou YouTube + overlays.

## 1. Scénarisation IA (Claude)

Délégation à Claude de la génération du script JSON (sélection des clips, textes overlay, durées, copywriting, choix du timestamp YouTube le plus pertinent).

| Poste | Tokens estimés / vidéo | Coût unitaire (Sonnet 4.5) |
|---|---|---|
| Input (avis, popups, médias, prompts) | ~4 000 tok | 3 $/M → **0,012 $** |
| Output (JSON scénario + textes) | ~1 500 tok | 15 $/M → **0,022 $** |
| **Total par vidéo** | ~5 500 tok | **≈ 0,034 $ ≈ 0,032 €** |

- **1 000 vidéos avec Sonnet :** ~34 $ ≈ **32 €**
- **1 000 vidéos avec Haiku** (suffisant pour ce type de tâche structurée) : **~3 à 5 €**

## 2. Rendu vidéo (Remotion)

**A. Rendu local / serveur dédié** (méthode actuelle)
- ~2–4 min CPU par vidéo de 17–19s en 720p/1080p
- Coût électricité/VM négligeable (~0,01 €/vidéo)
- **1 000 vidéos : ~10 € + ~50h machine**

**B. Remotion Lambda (AWS)** — recommandé pour le volume
- ~0,01 à 0,03 $/vidéo
- Parallélisable : rendu complet en < 1h
- **1 000 vidéos : ~20 €**

## 3. Coûts annexes

- **Téléchargement YouTube (yt-dlp) :** gratuit, ~50–200 Mo par source, stockage temporaire négligeable.
- **Voix off IA (ElevenLabs) si ajoutée :** ~0,10 à 0,30 €/vidéo → **+100 à 300 €** pour 1 000.
- **Musique libre de droits :** 0 € (Pixabay, YouTube Audio Library).

## 💰 Total réaliste pour 1 000 vidéos

| Scénario | Coût total |
|---|---|
| **Minimal** (Haiku + rendu local, sans voix) | **~15–20 €** |
| **Standard** (Sonnet + Lambda, sans voix) | **~50–60 €** |
| **Premium** (Sonnet + Lambda + voix ElevenLabs) | **~250–350 €** |

Soit **entre 0,02 € et 0,35 € par vidéo finie**, hors temps de supervision humaine (QA / validation éditoriale ~30s par vidéo recommandé).

## Point d'attention

Le vrai goulot n'est pas le coût mais la **qualité des données source** :
- vidéos internes propres et bien sort-orderées,
- popups promotionnels bien rédigés,
- avis clients exploitables.

C'est là que se joue le rendu final, pas dans le prix du token.
