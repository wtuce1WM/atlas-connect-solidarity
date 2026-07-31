# Connecteur MCP / Claude

## Qu'est-ce que c'est ?

Le projet expose un **serveur MCP (Model Context Protocol)** public à l'URL :

```
https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/mcp
```

Ce serveur permet à des clients MCP comme **Claude.ai**, Cursor ou ChatGPT d'appeler des outils One World Morocco directement dans leurs conversations IA.

## État actuel : public sans authentification

- Le serveur est **public** (`auth: none` dans le manifeste MCP).
- N'importe qui peut l'ajouter à son client MCP s'il connaît l'URL.
- Aucune donnée privée, membre ou affilié n'est exposée.

## Outils exposés

| Outil | Usage |
|---|---|
| `search_businesses` | Recherche textuelle dans le catalogue public d'établissements |
| `get_business` | Détail complet d'une fiche par son slug |
| `get_business_relations` | POIs, destinations et événements liés à un établissement |
| `list_businesses_near_poi` | Établissements liés à un point d'intérêt (ex: Jemaa el-Fna) |
| `list_blog_articles` | Liste des articles de blog publiés |
| `get_blog_article` | Contenu complet d'un article de blog par slug |

## Intérêt

- **Visibilité organique** : Claude peut citer des fiches et articles One World Morocco dans ses réponses.
- **Distribution sans coût** : les utilisateurs de clients MCP peuvent découvrir la plateforme en posant des questions sur Marrakech, Essaouira, etc.
- **Données à jour** : le client lit le contenu en direct, pas une connaissance statique.

## Risques et limites

- N'importe qui peut appeler le serveur (lecture seule, pas de mutation possible).
- Les données exposées sont déjà publiques sur `oneworldmorocco.com`.
- Pas de rate limiting spécifique MCP en place — à surveiller si le trafic augmente.

## Évolution possible

Si ce connecteur doit devenir un avantage réservé aux membres du Club, il faut le basculer en **OAuth** via les comptes Lovable Cloud. Cela change le flux de connexion et exige une ré-authentification des clients MCP.

## Fichiers concernés

- Définition des outils : `src/lib/mcp/tools/`
- Définition du serveur : `src/lib/mcp/index.ts`
- Fonction Edge : `supabase/functions/mcp/index.ts` (générée automatiquement par le plugin Vite)
- Manifeste : `.lovable/mcp/manifest.json`
