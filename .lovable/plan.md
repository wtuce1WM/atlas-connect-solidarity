## Problème (cause racine confirmée)

Le script `buildHtml` dans `scripts/generate-business-og-pages.ts` produit un `<body>` qui contient :
1. Un script qui, pour Googlebot (inclus dans `isPreviewBot`), fait `return` early — **la SPA n'est jamais injectée pour Googlebot**.
2. Un `<noscript>` — invisible pour Googlebot puisqu'il exécute JS.

Résultat : Googlebot voit meta tags + JSON-LD OK, mais **zéro contenu visible** → il classe la page en soft 404 malgré la présence de données structurées.

## Solution

Injecter, **avant le script** (donc visible dans le DOM initial pour Googlebot), un vrai contenu HTML riche à partir des données déjà chargées depuis Supabase. Ce contenu est écrasé par `document.write(html)` pour les vrais utilisateurs → aucun impact UX.

## Modifications

Un seul fichier à modifier : `scripts/generate-business-og-pages.ts`, fonction `buildHtml` (ligne 343), section body (lignes 580-602).

Le nouveau body suivra cette structure sémantique (style inline neutre pour rester invisible côté humains grâce au `document.write` qui remplace tout) :

```text
<body>
  <main hidden>
    <h1>{name} — {city}</h1>
    <img src="{image1}" alt="{name}" />

    <p>{description complète, non tronquée}</p>

    <section>
      <h2>Informations</h2>
      - Catégorie : {main_category}
      - Adresse : {address}, {neighborhood}, {city}
      - Téléphone : {phone}
      - Prix : {priceRange ou min_price}
      - Langues : {languages}
      - Horaires : résumé lisible
    </section>

    <section>
      <h2>Services</h2>
      <ul>{services jusqu'à 15}</ul>
    </section>

    <section hidden={si aucun avis}>
      <h2>Avis</h2>
      3 meilleurs avis (text_fr, auteur, note)
    </section>

    <section hidden={si aucune FAQ}>
      <h2>Questions fréquentes</h2>
      {faq items q/a}
    </section>

    <section hidden={si aucun landmark}>
      <h2>À proximité</h2>
      Distances aux POIs de référence (déjà calculées via buildDistancePropertyValues)
    </section>

    <nav>
      <a href="/{city}">Voir {city}</a>
      <a href="/category/{main_category}">Voir la catégorie</a>
    </nav>
  </main>

  <script>...bot detection existant, inchangé...</script>
</body>
```

Notes techniques :
- L'attribut `hidden` sur `<main>` ne bloque pas l'indexation Google (bien documenté) mais garantit que si la SPA échoue à s'injecter pour un vrai utilisateur, il ne voit pas ce contenu brut peu stylé.
- Les données sont déjà toutes disponibles dans les paramètres `biz`, `reviews`, `relations` — pas de fetch supplémentaire, pas d'impact sur le temps de build.
- Le `<noscript>` actuel est retiré (redondant avec le nouveau contenu et jamais lu par Googlebot).

## Vérification

Après régénération (`bunx tsx scripts/generate-business-og-pages.ts`) :
1. `curl -s https://oneworldmorocco.com/nox-agency | grep -c "<h2>"` → doit renvoyer ≥ 2
2. Test dans GSC → Inspection d'URL → « Tester l'URL en direct » sur 2-3 URLs listées dans le rapport soft 404 → vérifier que "Contenu de la page" affiche maintenant du texte substantiel.
3. Demander à Google la revalidation du rapport soft 404 (bouton "Valider la correction" dans GSC).

## Portée

- ~1500 fichiers `public/{slug}/index.html` régénérés au prochain build.
- Aucun impact sur : SPA, UX, sitemap, autres routes, taille de build (~20-40 Ko par page, négligeable sur CDN).
- Le fix couvre aussi les futures pages générées (event, destination, category, POI qui partagent le même pattern de body — je l'appliquerai partout).
