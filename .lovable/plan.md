
# Migration du blog statique vers la DB

## Ce qu'on a aujourd'hui

- 16 articles en composants React statiques dans `src/pages/*.tsx`, déclarés un à un dans `src/App.tsx` (`/blog/<slug>`).
- 14/16 utilisent un même format simple : `BlogArticleEntry[]` rendu par `src/components/blog/BlogArticleTemplate.tsx`. Chaque entrée = `{ pretitle, title, hours, paragraphs[], extraIds? }` + un `id` business pointant la fiche.
- 2/16 sont "spéciaux" (ex : `MarrakechArtisanat5Jours.tsx` = itinéraire 5 jours avec fetch dynamique Supabase, layout custom).
- Table `blog_posts` existe déjà avec colonnes multilingues `title_*`, `excerpt_*`, `content_*`, `slug`, `cover_image_url`, `author_name`, `is_published`, `published_at`. **0 ligne en DB aujourd'hui.**
- Le sitemap référence les 16 slugs en dur dans `scripts/generate-sitemap.ts`.

## Objectif

- Tous les articles servis depuis la DB via une route unique `/blog/:slug` (le composant `BlogPost.tsx` existe déjà mais n'est pas branché data).
- Format de contenu **structuré** (pas du HTML libre) pour rester multilingue, propre, éditable depuis le back-office, et facile à traduire en EN/AR plus tard.
- Aucun changement d'URL public, aucun lien cassé, sitemap inchangé côté public.
- Les 2 articles à layout custom restent en composants React pour l'instant (on les marque en DB comme `template = 'custom'` avec un pointeur).

## Modèle de contenu

Ajout d'une colonne `entries_fr/en/ar JSONB` et `template TEXT` (défaut `'article_template'`) sur `blog_posts`. Pas de HTML libre — on stocke directement un `BlogArticleEntry[]` :

```text
entries_fr = [
  { business_id, pretitle, title, hours, paragraphs[], extra_ids?[] },
  ...
]
```

Le composant `BlogPost.tsx` lit `entries_<lang>` (avec fallback FR) et délègue à `BlogArticleTemplate`. Si `template = 'custom'`, il render le composant React correspondant (table de routage `slug → React component`).

Champs DB complétés à l'import pour chaque article :
- `slug`, `title_fr`, `excerpt_fr`, `cover_image_url`, `author_name`, `is_published=true`, `published_at`
- `entries_fr` (array JSON extrait du fichier `.tsx`)
- `template = 'article_template'` (sauf les 2 customs : `template='custom'`, `entries_fr=null`)
- Colonnes EN/AR laissées vides — à remplir plus tard (batch IA).

## Étapes

### 1. Migration SQL
- Ajouter colonnes `entries_fr/en/ar` (JSONB) et `template` (TEXT, défaut `'article_template'`) sur `blog_posts`.
- Ajouter `hero_top_image_url`, `pretitle_fr/en/ar` (chapeau global), `cta_label_fr/en/ar` si besoin pour reproduire le header des pages actuelles (à confirmer après lecture d'un Blog<Slug>.tsx complet).
- Index sur `slug` (unique déjà ?), `is_published`, `published_at`.
- Politiques RLS : `SELECT` public uniquement sur `is_published=true` ; staff = full CRUD via `has_role('admin'|'staff')`. GRANT `SELECT` à `anon` + `authenticated`, `ALL` à `service_role`.

### 2. Script d'import
- `scripts/import-blog-posts.ts` : lit chacun des 16 fichiers `.tsx`, extrait l'array `BlogArticleEntry[]` par parsing AST (TypeScript Compiler API) ou regex contrôlée sur ce format très répétitif.
- Génère un seed JSON `scripts/blog-seed.json` (rejouable).
- Insertion via une migration `INSERT` (ou tool `supabase--insert`), un row par article, avec `slug` = celui de la route.

### 3. Composant `BlogPost.tsx`
- Refonte pour : `useParams() → slug → supabase.from('blog_posts').select().eq('slug',slug).single()`.
- Si `template='article_template'` → render `<BlogArticleTemplate entries={post[`entries_${lang}`] ?? post.entries_fr} />` + header (titre, excerpt, cover).
- Si `template='custom'` → lookup d'un registre `{ "5-jours-marrakech-artisanat": MarrakechArtisanat5Jours, ... }` et render le composant.
- `useSEO` lit `title_*`, `excerpt_*`, `cover_image_url`.
- 404 propre si slug inconnu ou `is_published=false` (hors staff).

### 4. Nettoyage routes
- Dans `src/App.tsx` : supprimer les 16 routes statiques `/blog/<slug>` → tout passe par `/blog/:slug` (déjà déclaré ligne 222).
- **Conserver** les 2 routes custom pendant la transition (l'article custom reste en code, le row DB pointe juste vers son composant via `template='custom'`).
- Supprimer les fichiers `src/pages/<14 articles simples>.tsx` après vérif visuelle.

### 5. Sitemap
- Remplacer `BLOG_POST_SLUGS` hardcodé dans `scripts/generate-sitemap.ts` par un fetch Supabase des `slug` où `is_published=true` (priority 0.9, changefreq weekly conservés).

### 6. Back-office (minimal)
- Pas dans cette PR : on se contente d'une migration techniquement propre.
- Prochaine étape (à confirmer après) : page `/staff/blog` avec liste + éditeur `entries_fr` (drag-drop des sections + lookup business par UUID/nom).

## Ce que ça **ne** fait pas

- Pas de traduction EN/AR pour cette étape — colonnes créées vides, à remplir plus tard via batch IA.
- Pas d'UI back-office d'édition — pour l'instant, modification = update SQL ou ré-import.
- Pas de migration des 2 articles custom (`MarrakechArtisanat5Jours` + un autre TBD) — ils restent en code, juste référencés en DB.
- Pas de changement SEO : `useSEO` continue de produire les mêmes balises ; les meta statiques `public/<slug>/index.html` qui existent pour certaines fiches business ne sont pas concernées.

## Risques / points d'attention

1. **Parsing TSX** : si un article a une variation de format (commentaires JSX, balises inline dans les paragraphes), le script doit fallback en édition manuelle pour ces cas. Mitigation : audit rapide des 14 fichiers avant import et liste explicite des "à reprendre".
2. **Images statiques** (`import xxx from '@/assets/...'`) : certains articles importent une image asset locale comme cover (ex : `HotelsRiadsVueMerEssaouira.tsx`). Stockage en `cover_image_url` = uploader ces images vers Supabase Storage `blog-covers/` et stocker l'URL publique.
3. **Lien "Voir la fiche" via `extra_ids`** : déjà géré par `BlogArticleTemplate` côté lookup business → rien à changer.
4. **Cache CDN/SWR** : penser à `cache: no-store` ou un `staleTime` court côté React Query pour que la publication d'un nouvel article apparaisse vite.

## Validation avant merge

- Visiter les 14 URLs migrées en preview, comparer pixel-perfect avec la version actuelle (screenshot diff sur 3-4 articles représentatifs).
- Vérifier que les 2 articles `template='custom'` répondent toujours.
- Lancer `scripts/generate-sitemap.ts` → vérifier que le nombre de blog_post URLs ≥ 16.
- Confirmer côté staff : update d'un row → réflexion immédiate sur la page publique.

## Estimation

- ~1h : migration SQL + import script + seed.
- ~1h : refonte `BlogPost.tsx` + registre custom.
- ~30 min : nettoyage routes + suppression fichiers + sitemap dynamique.
- ~30 min : tests visuels.

**Total : ~3h de travail focus.** Pas de breaking change utilisateur attendu.

---

OK pour partir sur ce plan ?
