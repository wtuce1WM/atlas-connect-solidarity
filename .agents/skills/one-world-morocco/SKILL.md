---
name: one-world-morocco
description: Contexte de travail et règles projet pour One World Morocco — Maroc, Marrakech/Essaouira. S'applique à toute tâche sur ce projet (Club AI, Studio Vidéo, blog, back-office, affiliés, fiches établissements, SEO).
---

# One World Morocco — Contexte & Règles de travail

## 1. Qui est l'utilisateur

- **Nom / handle** : Julien, WTUCE.
- **Rôle** : Fondateur et opérateur unique de **One World Morocco**.
- **Profil technique** : Non-développeur, mais fluide sur le schéma de base, les edge functions, la logique de routage et les décisions produit.
- **Mode de travail** : Repère les bugs sur ses appareils réels avec des chemins de repro exacts. Corrige par itérations courtes. Demande des preuves (logs, curl, SQL, captures) avant d'accepter qu'un bug est réglé.
- **Langue de travail** : Français, court et direct. Pas de padding.

## 2. Ce qu'est One World Morocco

Plateforme de découverte et de réservation au Maroc, avec trois piliers actifs :

1. **Catalogue public** : fiches d'établissements (restaurants, hôtels, riads, activités, boutiques) à Marrakech, Essaouira et ailleurs.
2. **Club (membres)** : assistant IA, carte de membre digitale, avantages.
3. **Back-office B2B** : espace affiliés pour gérer la fiche de son établissement, vidéos, avis, offres, services.

## 3. Stack & vocabulaire interne

- **Frontend** : React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
- **Backend** : Lovable Cloud (base de données, auth, edge functions, storage). On ne dit **jamais** "Supabase" côté client.
- **Auth** : compte Club via Google/Apple. Affilié est un rôle séparé (même email = comptes distincts).
- **AI** : Lovable AI Gateway. Modèle par défaut : `openai/gpt-5.6-sol` pour chat. Gemini pour les tâches multimodales/volume.
- **Vidéo** : Remotion + worker GitHub Actions pour le rendu.
- **SEO** : URLs propres, meta-tags dynamiques, partage via domaine public `oneworldmorocco.com`.
- **Design** : thème sombre. Terracotta (primary), #25D366 (WhatsApp), #D4AF37 (or). Typographie Montserrat + Avenir/Nunito Sans.

## 4. Règles métier non négociables

- **Prix / réservation** : on utilise **uniquement** `min_price` et `manual_price_range`. On ne touche **jamais** à `gamme_id` pour le booking ou le pricing.
- **Pas de follow-up "moins cher"** : le Club IA ne propose jamais de chercher "plus abordable" ou "moins cher" après une réponse.
- **Géo par défaut** : si la requête est vague et l'utilisateur est géolocalisé à moins de 80 km d'Essaouira, on base sur Essaouira. Sinon, on base sur Marrakech.
- **Partage** : les liens partageables utilisent toujours le domaine public `https://oneworldmorocco.com/`, jamais l'URL Lovable preview ou l'URL backend brute.
- **Pas de service role key** : jamais exposée, jamais demandée, jamais dans le front. Les données sensibles passent par des edge functions avec auth.
- **RLS** : toute nouvelle table a GRANT + RLS + policies. Pas de table anonyme sans raison explicite.
- **Roles** : stockés dans une table `user_roles` séparée, jamais dans `profiles` ou `users`.

## 5. Architecture partagée (ne jamais dupliquer)

- Le **Club IA** délègue au moteur `/search`.
- Les **articles de blog** réutilisent le `BlogArticleTemplate`.
- Les **vidéos studio** réutilisent `BusinessShowcase`.
- Quand une sous-système existe, on l'étend. On ne le refait pas en parallèle.

## 6. Chantiers actifs en priorité

### 6.1 Club AI Assistant — routeur déterministe

Objectif : réduire la consommation LLM et éviter les hallucinations.
Routes court-circuitées : recherche, affinement, agenda, carte, favoris, détails, ouvert-now, météo, réservation, proximité, prix, anaphore, hors-scope, détection de langue, suggestions sémantiques, RAG blog.

Chaque route doit : d'abord un raccourci déterministe (SQL, relations, moteur de recherche), puis le LLM uniquement pour la synthèse éditoriale.

### 6.2 Série éditoriale "Top 20"

Articles de blog (luxe, bord de mer, riads, tables, nightlife, tapis, etc.) construits sur un template partagé avec : podium, ruban, flag featured, avis dynamiques, filtres SQL explicites.

## 7. Anti-patterns (ne jamais faire)

- Ne pas refaire un système qui existe déjà.
- Ne pas demander de "choisir Supabase" : il n'y a que Lovable Cloud.
- Ne pas mettre `gamme_id` dans une logique de prix ou de réservation.
- Ne pas suggérer de rendre des données privées publiques pour simplifier un connecteur.
- Ne pas faire de longues réponses théoriques. Implique, prouve, conclus.
- Ne pas dire "ça marche" sans vérification observable.
- Ne pas créer de tables sans GRANT + RLS.
- Ne pas oublier les index sur les nouvelles requêtes fréquentes.

## 8. Comment lire le contexte historique

Si un chantier long reprend après une interruption, le message de reprise doit contenir :

```text
Chantier : [nom]
Fichier : [chemin exact]
État actuel : [ce qui est en place / ce qui marche]
Problème : [symptôme exact]
Attendu : [résultat précis]
Contrainte : [règle KB ou mémoire]
```

## 9. Économie de crédits

- Un nouveau chat par chantier (Studio Vidéo, Club AI, Blog, back-office).
- Questions produit/arbitrage → ChatGPT / Claude, jamais dans le fil de build.
- Instrumenter les coûts IA/tokens avant d'activer à grande échelle.

## 10. Comment répondre à Julien

- Réponses courtes, directes, en français.
- Proposer les options avec trade-offs avant le choix.
- Préciser fichier et ligne quand on livre un fix.
- Donner un conseil par défaut, pas une liste infinie.
- Signaler immédiatement les régressions possibles.
- Quand il dit "c'est toi le chef", il délègue mais il vérifie derrière.
