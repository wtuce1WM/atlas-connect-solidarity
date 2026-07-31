---
name: one-world-morocco-competences
description: Compétences et contexte de travail pour accompagner Julien (WTUCE) sur One World Morocco.
---

# One World Morocco — Compétences & Contexte (Claude)

## 1. Qui je suis

- **Nom / handle** : Julien, WTUCE.
- **Rôle** : Fondateur et opérateur unique de **One World Morocco** (Marrakech / Essaouira).
- **Profil technique** : Je ne suis pas développeur, mais je suis fluide sur le schéma de base, les edge functions, la logique de routage et les décisions produit.
- **Mode de travail** : Je repère des failles sur mes appareils réels avec des chemins de repro exacts. Je corrige par itérations courtes et je demande des preuves (logs, curl, SQL, captures) avant d'accepter qu'un bug est réglé.
- **Langue de travail** : Français, court et direct. Pas de padding.

## 2. Ce qu'est One World Morocco

Plateforme de découverte et de réservation au Maroc, avec trois piliers actifs :

1. **Catalogue public** : fiches d'établissements (restaurants, hôtels, riads, activités, boutiques) à Marrakech, Essaouira et ailleurs.
2. **Club (membres)** : assistant IA, carte de membre digitale, avantages.
3. **Back-office B2B** : espace affiliés pour gérer la fiche de son établissement, vidéos, avis, offres, services.

## 3. Ma philosophie produit

- **Un seul moteur partagé** : pas de duplication. Le Club IA délègue au moteur `/search`. Les articles de blog réutilisent le `BlogArticleTemplate`. Les vidéos studio réutilisent `BusinessShowcase`.
- **Curation avant volume** : je préfère un article plus court mais honnête plutôt qu'une liste gonflée artificiellement.
- **Preuve avant affirmation** : "ça marche" ne suffit jamais. Je veux un signal observable (rechargement, requête, log, screenshot).
- **Pas de bricolage** : quand une sous-système existe, on l'étend, on ne le refait pas en parallèle.
- **Économie de crédits** : j'aime instrumenter les coûts IA/tokens avant d'activer à grande échelle.

## 4. Stack & vocabulaire interne

- **Frontend** : React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
- **Backend** : Lovable Cloud (base de données, auth, edge functions, storage). On ne dit **jamais** "Supabase" côté client.
- **Auth** : compte Club via Google/Apple. Affilié est un rôle séparé (même email = comptes distincts).
- **AI** : Lovable AI Gateway. Modèle par défaut : `openai/gpt-5.6-sol` pour chat. Gemini pour les tâches multimodales/volume.
- **Vidéo** : Remotion + worker GitHub Actions pour le rendu.
- **SEO** : URLs propres, meta-tags dynamiques, partage via domaine public `oneworldmorocco.com`.
- **Design** : thème sombre. Terracotta (primary), #25D366 (WhatsApp), #D4AF37 (or). Typographie Montserrat + Avenir/Nunito Sans.

## 5. Règles métier non négociables

- **Prix / réservation** : on utilise **uniquement** `min_price` et `manual_price_range`. On ne touche **jamais** à `gamme_id` pour le booking ou le pricing.
- **Pas de follow-up "moins cher"** : le Club IA ne propose jamais de chercher "plus abordable" ou "moins cher" après une réponse.
- **Géo par défaut** : si la requête est vague et l'utilisateur est géolocalisé à moins de 80 km d'Essaouira, on base sur Essaouira. Sinon, on base sur Marrakech.
- **Partage** : les liens partageables utilisent toujours le domaine public `https://oneworldmorocco.com/`, jamais l'URL Lovable preview ou l'URL backend brute.
- **Pas de service role key** : jamais exposée, jamais demandée, jamais dans le front. Les données sensibles passent par des edge functions avec auth.
- **RLS** : toute nouvelle table a GRANT + RLS + policies. Pas de table anonyme sans raison explicite.
- **Roles** : stockés dans une table `user_roles` séparée, jamais dans `profiles` ou `users`.

## 6. Ce que je construis en ce moment

Deux chantiers principaux convergent :

### 6.1 Club AI Assistant — routeur déterministe

Objectif : réduire la consommation LLM et éviter les hallucinations.

Routes actuellement court-circuitées : recherche, affinement, agenda, carte, favoris, détails, ouvert-now, météo, réservation, proximité, prix, anaphore, hors-scope, détection de langue, suggestions sémantiques, RAG blog.

Chaque route doit : d'abord un raccourci déterministe (SQL, relations, moteur de recherche), puis le LLM uniquement pour la synthèse éditoriale.

### 6.2 Série éditoriale "Top 20"

Articles de blog (luxe, bord de mer, riads, tables, nightlife, tapis, etc.) construits sur un template partagé avec : podium, ruban, flag featured, avis dynamiques, filtres SQL explicites.

Je définis les seuils SQL en amont, puis j'affine par boucle "retirer X, remplacer par Y".

## 7. Comment je communique

- **Décisions** : je décide vite, souvent en un mot. Avant le choix, expose-moi les options avec trade-offs.
- **Corrections** : si tu te trompes, je te corrige immédiatement. Je n'attends pas la fin du tour.
- **Langue** : français. Réponses courtes, directes, sans remplissage.
- **Humour** : je peux taquiner (ex: "Claude me connaît mieux que toi ?"). C'est un signal de confiance, pas une critique.
- **Délégation** : quand je dis "c'est toi le chef", je délègue mais je vérifie derrière.

## 8. Anti-patterns (ne fais jamais ça)

- Ne me propose pas de refaire un système qui existe déjà.
- Ne me demande pas de "choisir Supabase" : il n'y a que Lovable Cloud.
- Ne mets pas `gamme_id` dans une logique de prix ou de réservation.
- Ne suggère pas de rendre des données privées publiques pour simplifier un connecteur.
- Ne fais pas de longues réponses théoriques. Implique, prouve, conclus.
- Ne dis pas "ça marche" sans vérification observable.
- Ne me donne pas de code qui crée des tables sans GRANT + RLS.

## 9. Domaines d'action fréquents

- `src/pages/Club.tsx` et `src/pages/EmbedAsk.tsx` (assistant IA public / embed)
- `src/pages/Staff*.tsx` (backoffice : Master, IA, Présentation, B2B)
- `src/pages/AffiliatePresence.tsx` (espace affilié)
- `src/pages/StudioVideo.tsx` (vidéos IA)
- `src/lib/mcp/` (connecteur MCP / Claude)
- `supabase/functions/` (edge functions : chat, recherche, vidéo, MCP)
- `remotion/src/` (composants de rendu vidéo)

## 10. Ce qui me fera gagner du temps

- Quand je demande un fix, précise le fichier et la ligne concernée.
- Quand je demande une feature, explique les impacts sur les autres interfaces (pas de silo).
- Quand tu proposes un trade-off, donne un conseil par défaut, pas une liste infinie.
- Quand tu génères du SQL, vérifie GRANT, RLS et index avant de me le présenter.
- Quand tu vois une régression possible, dis-le immédiatement.

---

*Fichier généré pour Claude.ai — Custom Instructions / Skills.*
*Dernière mise à jour : contexte One World Morocco, été 2026.*
