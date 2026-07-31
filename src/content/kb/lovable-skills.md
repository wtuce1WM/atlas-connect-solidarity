# Skills Lovable — Comment fonctionne le contexte automatique

Ce document explique comment le projet embarque maintenant une **skill Lovable activable** qui charge automatiquement le contexte One World Morocco dans les futures sessions de build.

## Qu'est-ce qu'une skill Lovable ?

Une skill est un fichier de contexte structuré (Markdown + YAML frontmatter) rangé dans `.agents/skills/<nom-du-skill>/SKILL.md`.

Quand une skill est **activée** sur le workspace, Lovable la détecte automatiquement et l'injecte dans le prompt de l'agent dès qu'une tâche correspond à sa description. Cela évite de copier-coller manuellement les règles du projet à chaque nouvelle conversation.

## Pourquoi c'est utile ici

One World Morocco est un projet long avec beaucoup de règles durables :

- Pas de `gamme_id` pour le prix/booking.
- Backend = Lovable Cloud, jamais "Supabase" côté client.
- RLS + GRANT sur toutes les nouvelles tables.
- Club IA délégue au moteur `/search`.
- Articles de blog réutilisent `BlogArticleTemplate`.
- Vidéos studio réutilisent `BusinessShowcase`.
- Rejeter les duplications et les systèmes parallèles.

Avant la skill, ces règles devaient être réinjectées à la main ou redevinées par l'agent. Avec la skill, elles sont rappelées automatiquement.

## Où vit la skill dans le projet

- Fichier source : `.agents/skills/one-world-morocco/SKILL.md`
- Activation : via **Settings > Skills** dans l'interface Lovable (ou équivalent workspace).
- Le fichier est versionné avec le projet : quand les règles changent, la skill doit être mise à jour en même temps que le KB.

## Comment la skill se déclenche

La skill contient un champ `description` dans son YAML frontmatter. Lovable l'utilise pour matcher les requêtes. Si l'utilisateur demande quelque chose en lien avec One World Morocco, le Club AI, le Studio Vidéo, les fiches établissements, le blog, etc., la skill est chargée automatiquement.

## Différence avec le KB du backoffice

| Outil | Où | Quand chargé | Public / interne |
|---|---|---|---|
| **Skill Lovable** | `.agents/skills/one-world-morocco/SKILL.md` | Automatique, par retrieval | Interne aux agents Lovable |
| **KB backoffice** | `src/content/kb/*.md` | Affiché dans l'onglet Connaissances de `/staff/master` | Lecture seule pour le staff |
| **Skill Claude** | `COMPETENCES-1WM-CLAUDE.md` | Upload manuel dans Claude.ai | Pour les agents Claude |

La skill Lovable et la skill Claude sont deux canaux différents. Si une règle change, il faut idéalement mettre à jour les deux + le KB pour rester cohérent.

## Quand faut-il mettre à jour la skill ?

Mettre à jour `.agents/skills/one-world-morocco/SKILL.md` quand :

- Une nouvelle règle métier devient durable (ex: nouvelle contrainte de pricing, de géo, de rôles).
- Un anti-pattern est découvert et doit être bloqué définitivement.
- La stack ou les chantiers prioritaires changent durablement.
- Une décision d'architecture (moteur partagé, template, etc.) est renforcée.

Ne pas mettre dans la skill :
- Les détails de code (noms de fichiers, ligne 42, etc.) — ces informations changent trop vite.
- Les bugs temporaires du jour.
- Les idées non validées.

## Cycle de vie

1. **Brouillon** : on écrit dans `.agents/skills/one-world-morocco/SKILL.md`.
2. **Activation** : on demande à Lovable d'appliquer le brouillon (`skills--apply_draft`).
3. **Vérification** : dans une nouvelle conversation, on demande une tâche typique et on vérifie que l'agent respecte les règles (ex: pas de `gamme_id`, pas de "Supabase" côté client).
4. **Maintenance** : quand une règle évolue, on met à jour la skill avant de continuer le build.

## Sécurité et bonnes pratiques

- La skill ne doit jamais contenir de secrets, clés API, ou service role key.
- Elle ne remplace pas les RLS, les policies, ou l'authentification.
- Elle est un guide de comportement pour l'agent, pas une source de vérité runtime pour l'application.

## Résumé

- **Skill Lovable** = contexte projet injecté automatiquement dans les prochaines sessions.
- **KB backoffice** = documentation de référence visible par le staff.
- **Skill Claude** = même contexte pour les agents Claude.ai.
- Les trois doivent rester synchronisés sur les règles durables.
