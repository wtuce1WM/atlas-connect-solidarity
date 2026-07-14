# Sélecteur multilingue public EN/AR

Objectif : rendre les versions EN et AR indexables via des URLs distinctes, avec un sélecteur visible partout, sans casser le FR existant.

## 1. Structure d'URLs

```text
/fiche/koulchi-pop           → FR (canonique, inchangé)
/en/fiche/koulchi-pop        → EN
/ar/fiche/koulchi-pop        → AR
```

Règles :
- Le FR reste sur les URLs actuelles (pas de `/fr/`) — préserve tout le SEO acquis, pas de redirections massives.
- `/en` et `/ar` sont juste un **préfixe** ajouté devant n'importe quelle route existante.
- `/en` (sans slug) et `/ar` (sans slug) → homepage traduite.

## 2. Détection langue depuis l'URL

Nouveau hook `useUrlLanguage()` qui lit `location.pathname` :
- Commence par `/en/` ou = `/en` → `en`
- Commence par `/ar/` ou = `/ar` → `ar`
- Sinon → `fr`

`LanguageContext` est branché sur ce hook. La source de vérité devient l'URL (plus le localStorage). Le contexte expose toujours `language` et `setLanguage`, mais `setLanguage(lang)` fait un `navigate()` vers l'URL préfixée équivalente.

Suppression du gating `useEnglishFlag` sur le sélecteur (EN et AR deviennent publics). Le flag reste utilisable pour d'autres besoins internes mais n'affecte plus la visibilité du menu.

## 3. Router

Dans `src/App.tsx`, wrapper toutes les routes existantes dans un layout qui monte 3 fois le même `<Routes>` sous 3 basenames :

```text
<Route path="/en/*" element={<LocalizedApp lang="en" />} />
<Route path="/ar/*" element={<LocalizedApp lang="ar" />} />
<Route path="/*" element={<LocalizedApp lang="fr" />} />
```

`LocalizedApp` définit la langue dans le contexte et rend l'arbre `<Routes>` actuel. Zéro duplication de routes.

## 4. Sélecteur public

Refonte de `src/components/LanguageSwitcher.tsx` :
- Supprime le gate `useEnglishFlag` → les 3 langues toujours visibles.
- Au clic, calcule la nouvelle URL en remplaçant/ajoutant le préfixe et préserve le path + query :
  - depuis `/fiche/x?y=1` + choix EN → `/en/fiche/x?y=1`
  - depuis `/en/fiche/x` + choix FR → `/fiche/x`
- Intégré dans le header global (déjà présent dans `HomeMindtripHeader` + `FrontStructureNavBar` d'après recherche).

## 5. RTL pour l'arabe

Dans `LocalizedApp` (ou un effet global) :
- Quand `lang === "ar"` : `document.documentElement.setAttribute("dir", "rtl")` + `lang="ar"`.
- Sinon : `dir="ltr"` + `lang="fr"` ou `"en"`.

Aucun CSS RTL global dans ce turn (juste la direction du document). Le pass RTL complet reste hors scope.

## 6. Badge "Not yet translated"

Nouveau composant `<TranslationFallbackBadge />` réutilisable, affiché quand une page en EN/AR sert du contenu FR faute de traduction. Petit badge discret en haut de page (style neutre, terracotta) : *"Not yet translated — showing French version"* / *"غير مترجمة بعد"*.

Logique par surface (dans ce turn on branche 2 endroits pilotes, on itérera après) :
- **Fiches business** (`BookOnlineSlidePanel` / `FicheImmersive`) : compare `hook_en/description_en` vs `hook_fr/description_fr`. Si vide en langue courante → badge + fallback FR.
- **Homepage** : pas de badge (contenu géré par `LABELS` locaux et sections dynamiques).

Le reste du site continuera de servir FR silencieusement jusqu'à ce qu'on branche le badge dessus.

## 7. hreflang (SEO)

Dans `RouteSeo.tsx` (et pour les pages dynamiques dans leurs `useSEO`), ajouter systématiquement :

```html
<link rel="alternate" hreflang="fr" href="https://oneworldmorocco.com{path}" />
<link rel="alternate" hreflang="en" href="https://oneworldmorocco.com/en{path}" />
<link rel="alternate" hreflang="ar" href="https://oneworldmorocco.com/ar{path}" />
<link rel="alternate" hreflang="x-default" href="https://oneworldmorocco.com{path}" />
```

Où `{path}` = pathname courant **sans préfixe langue**.

Le canonical d'une page reste **self-referential** : `/en/fiche/x` a comme canonical `.../en/fiche/x` (règle Google : chaque variante hreflang doit avoir son canonical propre).

## 8. Hors scope de ce turn

- **Sitemap multilingue** (`generate-sitemap` edge function) — tu veux d'abord voir la structure vivre. On l'attaquera après validation.
- **Pass CSS RTL complet** (miroir des layouts, spacing) — juste `dir="rtl"` posé, le rendu visuel sera imparfait.
- **Traduction des `LABELS` locaux** dans les composants non encore i18n-isés.
- **Rewrite du `slug`** en EN/AR (les slugs restent FR pour l'instant).

## Fichiers modifiés

- `src/App.tsx` — wrapper `LocalizedApp` + routes `/en/*` `/ar/*`
- `src/contexts/LanguageContext.tsx` — source = URL, `setLanguage` = navigate
- `src/components/LanguageSwitcher.tsx` — publique, navigation URL
- `src/seo/RouteSeo.tsx` — hreflang
- `src/hooks/useSEO.ts` — hreflang pour pages dynamiques
- `src/components/TranslationFallbackBadge.tsx` — nouveau
- `src/components/slidepanel/BookOnlineSlidePanel.tsx` (ou parent) — branchement badge fiche

## Validation

Après implémentation :
1. `/` → FR normal, sélecteur montre les 3 langues
2. `/en/fiche/koulchi-pop` → contenu EN si dispo, sinon FR + badge
3. `/ar/fiche/koulchi-pop` → `dir="rtl"` sur `<html>`, contenu AR si dispo
4. Switch de langue préserve le path + query
5. `view-source` d'une fiche montre 3 balises `hreflang` + canonical auto-référencé
