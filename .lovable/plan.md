## Objectif

Mettre en place `react-helmet-async` pour gérer un `<title>` et une `<meta name="description">` propres à chaque page, et afficher ces valeurs dans le tableau Pages du back-office.

## Étapes

### 1. Installation & provider
- `bun add react-helmet-async`
- Wrapper `<HelmetProvider>` autour de `<BrowserRouter>` dans `src/main.tsx`.

### 2. Source de vérité centralisée
Créer `src/seo/pageMeta.ts` exportant un objet :
```ts
export const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": { title: "...", description: "..." },
  "/search": { ... },
  ...
}
```
Une entrée par route listée dans le tableau Pages (clé = `url` du tableau, ex. `/blog/:slug`).

### 3. Composant `<PageSeo />`
Créer `src/seo/PageSeo.tsx` :
- prop `routeKey` (ex. `"/blog/:slug"`)
- props optionnelles `title` / `description` pour override dynamique (article blog, fiche…)
- rend `<Helmet><title>…</title><meta name="description" …/></Helmet>`

### 4. Injection dans les pages
Ajouter `<PageSeo routeKey="…" />` en haut du JSX de chaque page listée :
- Pages statiques : valeurs prises dans `PAGE_META`.
- Pages dynamiques (`/blog/:slug`, `/fiche/:slug`, `/category/:categoryName`, `/city/:city`, etc.) : override avec données chargées (ex. titre de l'article, nom de la catégorie).

### 5. Back-office — tableau Pages
Dans `src/pages/StaffFront.tsx`, onglet Pages :
- importer `PAGE_META`
- colonne « Description (meta) » : afficher `PAGE_META[p.url]?.description` (au lieu du `document.querySelector` actuel)
- ajouter aussi (optionnel mais utile) une colonne « Title » si tu veux la voir.

### 6. Cohérence avec `index.html`
- Garder les balises statiques actuelles dans `index.html` comme fallback pour les crawlers sociaux (WhatsApp/Facebook ne lisent pas le JS — déjà documenté dans la mémoire projet « Share Previews Strategy »).
- Supprimer `<link rel="canonical">` de `index.html` uniquement si on ajoute un canonical par route (pas dans ce lot — on reste sur title + description pour rester minimal).

## Note importante (contrainte hosting)

Le site est hébergé sur Lovable sans SSR : les meta injectées par Helmet ne sont visibles que des crawlers qui exécutent le JS (Googlebot oui ; WhatsApp/Facebook/LinkedIn non). Pour les aperçus de partage, l'`index.html` statique reste la source. C'est déjà la stratégie documentée du projet.

## Périmètre

Lot 1 (ce plan) : infra Helmet + meta pour toutes les pages **statiques** listées dans le tableau Pages + affichage dans le back-office.

Lot 2 (à faire ensuite si tu valides) : meta dynamiques pour `/blog/:slug`, `/fiche/:slug`, `/category/:categoryName`, `/city/:city`, `/neighborhood/:neighborhood`, `/destination/:destinationName`, `/u/:pseudo`, `/y/:slug` — chacune branchée sur sa source de données.

Confirme et je commence par le Lot 1.