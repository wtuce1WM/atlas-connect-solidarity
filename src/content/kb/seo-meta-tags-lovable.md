# SEO & balises meta — limite de l'hébergement Lovable

## Contexte

Le site est hébergé **directement sur Lovable** (pas de Vercel, pas de proxy, pas de SSR). Lovable sert toutes les routes "propres" (ex : `/blog/fermes-pedagogiques-marrakech`) via le **même `index.html` SPA** que la home.

## Conséquence pour le SEO

Pour une URL propre comme `/blog/<slug>` :

- Le HTML brut renvoyé par le serveur contient **toujours les balises génériques** de `index.html` :
  - `<title>ONE WORLD MOROCCO – Adresses sélectionnées au Maroc</title>`
  - `<meta name="description" content="Découvrez les meilleures adresses au Maroc…" />`
- Les balises spécifiques à l'article ne sont injectées qu'**après exécution du JavaScript** (via `react-helmet-async`).

Donc :

- **Googlebot** (qui exécute le JS) finit par voir les bonnes balises.
- **Les crawlers de prévisualisation sociale** (WhatsApp, Facebook, LinkedIn, Slack, X, iMessage) **n'exécutent pas le JS** → ils ne voient que les balises génériques.

## Ce qui ne marche pas

- ❌ Mettre un `<script>document.write(...)</script>` dans `index.html` pour générer dynamiquement les balises : ça pollue le HTML source et ne change rien pour les crawlers sans JS.
- ❌ Compter sur `react-helmet-async` seul pour les previews sociales.
- ❌ Pré-générer des `public/blog/<slug>/index.html` : Lovable les sert uniquement si l'URL contient explicitement `/index.html`, pas sur l'URL propre `/blog/<slug>`.

## Ce qui marche

1. **URL indexée explicite** : pointer les partages vers `/blog/<slug>/index.html` (le fichier pré-généré est bien servi tel quel).
2. **Balises SPA dynamiques** via `react-helmet-async` : suffisant pour Google après rendu JS, pas pour WhatsApp/LinkedIn.
3. **SSR / hébergement avec rewrites par route** (Vercel, Netlify, Cloudflare Workers…) si on veut de vraies balises serveur par URL propre. → nécessite de **quitter l'hébergement Lovable** ou d'ajouter un proxy en amont.

## Règle d'action pour l'IA

Avant de proposer une "correction" des balises meta par route sur l'hébergement Lovable actuel :

- Vérifier que la solution proposée ne repose pas sur du JS exécuté après chargement (sinon dire honnêtement que les previews sociales ne fonctionneront pas).
- Ne **jamais** réintroduire de `document.write` dans `index.html`.
- Si l'utilisateur veut de vraies balises serveur par route, lui rappeler que cela exige **un autre hébergement ou un proxy** — ce n'est pas un bug applicatif à corriger côté code.
