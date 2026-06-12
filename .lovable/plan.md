## Objectif

Appliquer **`HomeMindtripHeader`** (en haut) et **`Footer variant="verified"`** (en bas) de manière uniforme sur les 7 pages du parcours vitrine, en supprimant les headers/footers ad hoc.

## État actuel

| Page | Header actuel | Footer actuel | Action |
|---|---|---|---|
| `/` (Index) | HomeMindtrip ✅ | Footer verified ✅ | Rien |
| `/club` | HomeMindtrip ✅ | Footer ✅ | Forcer `variant="verified"`, nettoyer import `Header` inutilisé |
| `/devenir-affilie` | HomeMindtrip ✅ | Footer ✅ | Forcer `variant="verified"` |
| `/install` | HomeMindtrip ✅ | ❌ aucun | Ajouter `<Footer variant="verified" />` |
| `/join` | ❌ HTML custom (header sticky beige + footer inline) | ❌ HTML custom | Supprimer header/footer custom, wrapper avec HomeMindtripHeader + Footer |
| `/card` | ❌ HTML custom | ❌ HTML custom | Idem |
| `/corporate` | ❌ iframe srcDoc (607 lignes HTML) | ❌ iframe | Sortir de l'iframe : extraire le body, garder le CSS scopé, rendre en React avec header/footer partagés |

## Plan d'exécution

1. **Petites pages déjà alignées** — `Club`, `BecomeAffiliate`, `Install` : ajouter/forcer `Footer variant="verified"`, retirer imports inutilisés.
2. **Join & Card** : retirer les blocs `<header class="nav">…</header>` et le footer inline de leur HTML, ajuster le CSS (supprimer `header.nav` et règles sticky), englober le contenu dans un wrapper React `<HomeMindtripHeader /> … <Footer variant="verified" />`. Conserver tout le contenu interne (sections, CSS de page) inchangé.
3. **Corporate** (le plus lourd) :
   - Convertir `Corporate.tsx` pour ne plus utiliser l'iframe.
   - Extraire le `<body>` de `corporate.html` dans une string injectée via `dangerouslySetInnerHTML` à l'intérieur d'un wrapper `<div className="corporate-scope">` (avec le `<style>` original scopé via classe), pour éviter de tout réécrire en JSX.
   - Retirer le header/footer maison du HTML extrait.
   - Remplacer le `postMessage` `owm-nav` par une délégation de clic React vers `navigate()` sur les liens internes.
   - Header/footer React injectés au-dessus/au-dessous.

## Détails techniques

- `HomeMindtripHeader` est `position: fixed` et a un fond transparent par défaut puis sombre au scroll. Les pages `/join` et `/card` ont un fond beige clair (`#ECD6B8`) → ajouter `alwaysWhite={false}` (défaut) et un padding-top de ~80px sur le contenu pour ne pas être masqué par le header fixe. Le hamburger reste lisible (logique `blackHamburger` couvre déjà `/` et `/install` ; ajouter aussi `/join`, `/card`, `/corporate` à la condition si nécessaire).
- `Footer variant="verified"` est sombre — cohérent avec la marque, contraste accepté même au-dessus du beige.
- Aucun changement de logique métier, de routes, ni de SEO (les `useSEO` existants restent).
- Aucun changement de schéma DB ni d'edge function.

## Hors scope

- Refonte visuelle du contenu interne des pages (sections, copies, illustrations).
- Migration React complète de `corporate.html` en JSX (resterait du HTML injecté, simplement délivré sans iframe).
- Pages back-office / search / fiche.
