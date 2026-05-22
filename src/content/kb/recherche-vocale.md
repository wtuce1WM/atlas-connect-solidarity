# Recherche vocale — État & garde-fous

## Vue d'ensemble

La recherche vocale du site utilise deux moteurs selon la plateforme :

- **Desktop & Android** : Web Speech API native du navigateur
- **iOS (Safari, Chrome, Firefox, PWA)** : **ElevenLabs Scribe v2 realtime** via WebSocket
  → la Web Speech API d'iOS utilise la dictée Siri locale, très mauvaise en français et sur les noms propres (ex. *Essaouira*, *Marrakech*, *langouste*)

## Flux iOS (ElevenLabs Scribe)

1. L'utilisateur appuie sur le bouton micro
2. Le client demande un **token éphémère** à l'edge function `elevenlabs-scribe-token` (la clé API reste serveur)
3. Le SDK `useScribe` ouvre un WebSocket vers ElevenLabs et stream l'audio du micro
4. Les transcriptions partielles s'affichent en temps réel (`liveTranscript`)
5. Le segment est finalisé puis envoyé à l'extracteur d'intention LLM

## Garde-fous (fichier `src/hooks/useVoiceSearch.ts`)

| Garde-fou | Valeur | Rôle |
|---|---|---|
| **Silence VAD** | natif ElevenLabs | Commit automatique d'un segment quand l'utilisateur arrête de parler |
| **Silence fallback** | `SILENCE_DELAY_MS = 2000 ms` | Auto-finish si le VAD serveur ne commit jamais (cas iOS où on reste sur du `partial`) |
| **Durée max** | `MAX_RECORDING_MS = 30000 ms` | Coupe l'enregistrement après 30 s même sans aucun transcript reçu (micro muet, permission refusée silencieusement) |
| **Visibility change** | `visibilitychange` listener | Auto-finish si l'app passe en arrière-plan pendant un enregistrement (crucial pour iOS PWA où l'`AudioContext` + WebSocket sont suspendus) |

## Traces de debug

Toutes les étapes critiques sont logguées avec le préfixe `[Scribe]` :

```
[Scribe] connecting…
[Scribe] connected
[Scribe] partial: <texte>
[Scribe] committed: <texte>
[Scribe] silence timer fired -> auto-finish
[Scribe] max duration reached -> auto-finish
[Scribe] visibility hidden during recording -> auto-finish
[Scribe] finish -> disconnect & process
[Scribe] stop (user)
```

### Comment voir les logs sur iPhone

1. Sur iPhone : *Réglages → Safari → Avancé → Inspecteur Web* = ON
2. Brancher l'iPhone au Mac en USB
3. Sur Mac, Safari → menu **Développement → [Nom iPhone] → onglet de la page**
4. La console Web Inspector affiche les `[Scribe] …` en temps réel

## Compatibilité testée

| Plateforme | Statut | Notes |
|---|---|---|
| Desktop Chrome/Firefox/Edge | ✅ Web Speech API | OK |
| Desktop Safari | ✅ ElevenLabs Scribe | VAD parfois lent → fallback 2 s |
| iPhone Safari | ✅ ElevenLabs Scribe | Couvert par fallback 2 s |
| iPhone Chrome/Firefox | ✅ ElevenLabs Scribe | WebKit sous le capot, même comportement que Safari |
| iPhone PWA (Add to Home Screen) | ✅ ElevenLabs Scribe | ⚠️ permission micro redemandée à chaque session ; auto-stop sur retour de background |
| Android Chrome | ✅ Web Speech API | OK |
| Android Samsung Internet | 🟡 Web Speech API | WebSocket parfois capricieux en arrière-plan |

## Risques résiduels connus

1. **Latence réseau > 2 s** entre deux mots (3G/Edge) → on risque de couper au milieu d'une phrase
2. **iOS < 14.3** → `getUserMedia` non disponible en PWA (rare aujourd'hui)
3. **Permission micro refusée silencieusement** → couvert par le timeout 30 s

## Sécurité

- ✅ La clé `ELEVENLABS_API_KEY` reste côté serveur (edge function uniquement)
- ✅ Le client ne reçoit qu'un **single-use token** valable 15 minutes
- ✅ Aucun audio n'est stocké côté projet (streaming pur)
